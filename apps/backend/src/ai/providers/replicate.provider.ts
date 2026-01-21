import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfigurationType } from '@server/config/configuration';
import type { FileOutput, ServerSentEvent } from 'replicate';
import Replicate from 'replicate';
import type {
  AiAudioRequest,
  AiAudioResponse,
  AiContext,
  AiImageRequest,
  AiImageResponse,
  AiModels,
  AiProvider,
  AiTextRequest,
  AiTextResponse,
} from '../ai-provider.interface';

type ReplicateModelRef =
  | `${string}/${string}`
  | `${string}/${string}:${string}`;

type ReplicateConfig = {
  apiToken: string;
  baseUrl: string;
  textModel?: string;
  imageModel?: string;
  audioModel?: string;
  audioVoice?: string;
  timeoutMs: number;
  pollIntervalMs: number;
};

@Injectable()
export class ReplicateProvider implements AiProvider {
  id = 'replicate';

  constructor(private readonly configService: ConfigService) {}

  getModels(): AiModels {
    const config = this.getConfig();
    return {
      text: config.textModel ?? 'replicate-text',
      image: config.imageModel ?? 'replicate-image',
      audio: config.audioModel ?? 'replicate-audio',
    };
  }

  async generateText(
    request: AiTextRequest,
    _context: AiContext,
  ): Promise<AiTextResponse> {
    const config = this.getConfig();
    const modelRef = this.resolveModelRef(
      config.textModel,
      'REPLICATE_TEXT_MODEL',
    );

    const prompt = request.systemPrompt
      ? `${request.systemPrompt}\n\n${request.userPrompt}`
      : request.userPrompt;

    const input: Record<string, unknown> = {
      prompt,
    };

    if (request.temperature !== undefined) {
      input.temperature = request.temperature;
    }

    if (request.maxTokens !== undefined) {
      input.max_new_tokens = request.maxTokens;
    }

    const output = await this.runModel(modelRef, input, config);
    const text = this.extractText(output);

    return {
      text,
      model: modelRef,
      raw: output,
    };
  }

  async *streamText(
    request: AiTextRequest,
    _context: AiContext,
  ): AsyncGenerator<string> {
    const config = this.getConfig();
    const modelRef = this.resolveModelRef(
      config.textModel,
      'REPLICATE_TEXT_MODEL',
    );

    const prompt = request.systemPrompt
      ? `${request.systemPrompt}\n\n${request.userPrompt}`
      : request.userPrompt;

    const input: Record<string, unknown> = {
      prompt,
    };

    if (request.temperature !== undefined) {
      input.temperature = request.temperature;
    }

    if (request.maxTokens !== undefined) {
      input.max_new_tokens = request.maxTokens;
    }

    const client = this.createClient(config);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const stream = client.stream(modelRef, {
        input,
        signal: controller.signal,
        useFileOutput: false,
      });

      for await (const event of stream) {
        const chunk = this.extractStreamChunk(event);
        if (chunk) {
          yield chunk;
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateImage(
    request: AiImageRequest,
    _context: AiContext,
  ): Promise<AiImageResponse> {
    const config = this.getConfig();
    const modelRef = this.resolveModelRef(
      config.imageModel,
      'REPLICATE_IMAGE_MODEL',
    );

    const input: Record<string, unknown> = {
      prompt: request.prompt,
      num_outputs: 1,
    };

    const size = request.size ?? '1024x1024';
    const [width, height] = size.split('x').map((value) => Number(value));
    if (!Number.isNaN(width) && !Number.isNaN(height)) {
      input.width = width;
      input.height = height;
    }

    const output = await this.runModel(modelRef, input, config);
    const imageUrl = await this.extractUrl(output);

    return {
      imageUrl,
      model: modelRef,
    };
  }

  async generateAudio(
    request: AiAudioRequest,
    _context: AiContext,
  ): Promise<AiAudioResponse> {
    const config = this.getConfig();
    const modelRef = this.resolveModelRef(
      config.audioModel,
      'REPLICATE_AUDIO_MODEL',
    );

    const input: Record<string, unknown> = {
      text: request.text,
    };

    const voice = request.voice ?? config.audioVoice;
    if (voice) {
      input.voice = voice;
    }

    const output = await this.runModel(modelRef, input, config);
    const audioUrl = await this.extractUrl(output);

    return {
      audioUrl,
      model: modelRef,
    };
  }

  private async runModel(
    modelRef: ReplicateModelRef,
    input: Record<string, unknown>,
    config: ReplicateConfig,
  ) {
    const client = this.createClient(config);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      return await client.run(
        modelRef,
        {
          input,
          wait: {
            mode: 'poll',
            interval: config.pollIntervalMs,
          },
          signal: controller.signal,
        },
        undefined,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractText(output: unknown) {
    if (typeof output === 'string') {
      return output;
    }

    if (Array.isArray(output)) {
      return output.map((item) => String(item)).join('');
    }

    if (output && typeof output === 'object') {
      const candidate = (output as Record<string, unknown>).text;
      if (typeof candidate === 'string') {
        return candidate;
      }
    }

    return '';
  }

  private async extractUrl(output: unknown) {
    if (typeof output === 'string') {
      return this.normalizeUrl(output);
    }

    if (Array.isArray(output)) {
      const first = output[0];
      if (typeof first === 'string') {
        return this.normalizeUrl(first);
      }
      if (this.isFileOutput(first)) {
        return first.url().toString();
      }
    }

    if (output && typeof output === 'object') {
      if (this.isFileOutput(output)) {
        return output.url().toString();
      }
      const candidate =
        (output as Record<string, unknown>).url ??
        (output as Record<string, unknown>).audio ??
        (output as Record<string, unknown>).image;
      if (typeof candidate === 'string') {
        return this.normalizeUrl(candidate);
      }
    }

    return null;
  }

  private normalizeUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('http') || trimmed.startsWith('data:')) {
      return trimmed;
    }
    return `data:application/octet-stream;base64,${trimmed}`;
  }

  private extractStreamChunk(event: ServerSentEvent) {
    if (event.event === 'logs') {
      return null;
    }

    const raw = event.data?.trim();
    if (!raw || raw === '[DONE]') {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const candidate =
        parsed.token ??
        parsed.text ??
        parsed.output ??
        parsed.delta ??
        parsed.content ??
        parsed.completion;
      if (Array.isArray(candidate)) {
        return candidate.map((item) => String(item)).join('');
      }
      if (typeof candidate === 'string') {
        return candidate;
      }
    } catch {
      return raw;
    }

    if (event.event === 'output') {
      return raw;
    }

    return null;
  }

  private getConfig(): ReplicateConfig {
    const config = this.configService.get<AppConfigurationType['ai']>('ai');
    if (!config?.replicateApiKey) {
      throw new Error('REPLICATE_API_TOKEN is not configured');
    }

    return {
      apiToken: config.replicateApiKey,
      baseUrl: config.replicateBaseUrl ?? 'https://api.replicate.com/v1',
      textModel: config.replicateTextModel ?? undefined,
      imageModel: config.replicateImageModel ?? undefined,
      audioModel: config.replicateAudioModel ?? undefined,
      audioVoice: config.replicateAudioVoice ?? undefined,
      timeoutMs: config.replicateTimeoutMs ?? 60000,
      pollIntervalMs: config.replicatePollIntervalMs ?? 1200,
    };
  }

  private createClient(config: ReplicateConfig) {
    return new Replicate({
      auth: config.apiToken,
      baseUrl: config.baseUrl,
      useFileOutput: false,
    });
  }

  private resolveModelRef(
    modelRef: string | undefined,
    envVar: string,
  ): ReplicateModelRef {
    const trimmed = modelRef?.trim();
    if (!trimmed || !trimmed.includes('/')) {
      throw new Error(
        `${envVar} must be in the format "owner/name" or "owner/name:version"`,
      );
    }
    return trimmed as ReplicateModelRef;
  }

  private isFileOutput(value: unknown): value is FileOutput {
    return (
      typeof value === 'object' &&
      value !== null &&
      'url' in value &&
      typeof (value as FileOutput).url === 'function'
    );
  }
}
