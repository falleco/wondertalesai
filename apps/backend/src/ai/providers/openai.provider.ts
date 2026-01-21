import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfigurationType } from '@server/config/configuration';
import OpenAI from 'openai';
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

type OpenAiMessage = {
  role: 'system' | 'user';
  content: string;
};

@Injectable()
export class OpenAiProvider implements AiProvider {
  id = 'openai';

  constructor(private readonly configService: ConfigService) {}

  getModels(): AiModels {
    const config = this.getConfig();
    return {
      text: config.openAiTextModel,
      image: config.openAiImageModel,
      audio: config.openAiAudioModel,
    };
  }

  async generateText(
    request: AiTextRequest,
    _context: AiContext,
  ): Promise<AiTextResponse> {
    const config = this.getConfig();
    const messages = [
      request.systemPrompt
        ? { role: 'system', content: request.systemPrompt }
        : null,
      { role: 'user', content: request.userPrompt },
    ].filter(Boolean) as OpenAiMessage[];
    const body = {
      model: request.model ?? config.openAiTextModel,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 900,
      messages,
      ...(this.requiresJsonResponse(request) && {
        response_format: { type: 'json_object' as const },
      }),
    };

    const client = this.createClient(config);
    const response = await client.chat.completions.create(body);
    const text = response.choices[0]?.message?.content ?? '';
    return {
      text,
      model: body.model,
      raw: response,
    };
  }

  async generateImage(
    request: AiImageRequest,
    _context: AiContext,
  ): Promise<AiImageResponse> {
    const config = this.getConfig();
    const body = {
      model: request.model ?? config.openAiImageModel,
      prompt: request.prompt,
      size: request.size ?? '1024x1024',
    };

    const client = this.createClient(config);
    const response = await client.images.generate(body, {
      timeout: config.openAiImageTimeoutMs ?? config.openAiTimeoutMs,
    });
    const b64 = response.data?.[0]?.b64_json;
    const url = response.data?.[0]?.url ?? null;
    const imageUrl = b64 ? `data:image/png;base64,${b64}` : url;
    return {
      imageUrl,
      model: body.model,
    };
  }

  async generateAudio(
    request: AiAudioRequest,
    _context: AiContext,
  ): Promise<AiAudioResponse> {
    const config = this.getConfig();
    const body = {
      model: request.model ?? config.openAiAudioModel,
      voice: request.voice ?? config.openAiAudioVoice,
      input: request.text,
      response_format: 'mp3' as const,
    };

    const client = this.createClient(config);
    const response = await client.audio.speech.create(body, {
      timeout: config.openAiTimeoutMs,
    });
    const buffer = await response.arrayBuffer();
    const b64 = Buffer.from(buffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${b64}`;
    return {
      audioUrl,
      model: body.model,
    };
  }

  private getConfig() {
    const config = this.configService.get<AppConfigurationType['ai']>('ai');
    if (!config?.openAiKey) {
      throw new Error('LLM_OPEN_AI_KEY is not configured');
    }

    return {
      openAiKey: config.openAiKey,
      openAiBaseUrl: config.openAiBaseUrl ?? 'https://api.openai.com/v1',
      openAiTextModel: config.openAiTextModel ?? 'gpt-4o-mini',
      openAiImageModel: config.openAiImageModel ?? 'gpt-image-1',
      openAiAudioModel: config.openAiAudioModel ?? 'gpt-4o-mini-tts',
      openAiAudioVoice: config.openAiAudioVoice ?? 'alloy',
      openAiImageTimeoutMs: config.openAiImageTimeoutMs ?? 60000,
      openAiTimeoutMs: config.openAiTimeoutMs ?? 20000,
    };
  }

  private requiresJsonResponse(request: AiTextRequest) {
    const systemPrompt = request.systemPrompt?.toLowerCase() ?? '';
    const userPrompt = request.userPrompt.toLowerCase();
    return systemPrompt.includes('json') || userPrompt.includes('json');
  }

  private createClient(config: ReturnType<OpenAiProvider['getConfig']>) {
    return new OpenAI({
      apiKey: config.openAiKey,
      baseURL: config.openAiBaseUrl,
      timeout: config.openAiTimeoutMs,
    });
  }
}
