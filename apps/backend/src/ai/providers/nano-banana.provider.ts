import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfigurationType } from '@server/config/configuration';
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
import { OpenAiProvider } from './openai.provider';

type NanoBananaResponse = {
  imageUrl?: string;
  image_url?: string;
  url?: string;
  images?: string[];
  data?: Array<{
    url?: string;
    b64_json?: string;
    image?: string;
    image_base64?: string;
  }>;
  output?: string | string[];
  base64?: string;
};

@Injectable()
export class NanoBananaProvider implements AiProvider {
  id = 'nano-banana';

  constructor(
    private readonly configService: ConfigService,
    private readonly openAiProvider: OpenAiProvider,
  ) {}

  getModels(): AiModels {
    const config = this.getConfig();
    const fallback = this.openAiProvider.getModels();
    return {
      text: fallback.text,
      audio: fallback.audio,
      image: config.nanoBananaModel,
    };
  }

  async generateText(
    request: AiTextRequest,
    context: AiContext,
  ): Promise<AiTextResponse> {
    return this.openAiProvider.generateText(request, context);
  }

  async generateAudio(
    request: AiAudioRequest,
    context: AiContext,
  ): Promise<AiAudioResponse> {
    return this.openAiProvider.generateAudio(request, context);
  }

  async generateImage(
    request: AiImageRequest,
    _context: AiContext,
  ): Promise<AiImageResponse> {
    const config = this.getConfig();
    const body = {
      prompt: request.prompt,
      model: request.model ?? config.nanoBananaModel,
      size: request.size ?? config.nanoBananaImageSize ?? '1024x1024',
    };

    const response = await this.request<NanoBananaResponse>(
      config.nanoBananaEndpoint,
      body,
      config.nanoBananaTimeoutMs,
    );
    const imageUrl = this.extractImageUrl(response);

    return {
      imageUrl,
      model: body.model,
    };
  }

  private extractImageUrl(response: NanoBananaResponse): string | null {
    const direct =
      response.imageUrl ??
      response.image_url ??
      response.url ??
      response.base64 ??
      (Array.isArray(response.images) ? response.images[0] : undefined) ??
      (Array.isArray(response.output) ? response.output[0] : response.output);

    if (direct) {
      return this.normalizeImage(direct);
    }

    if (response.data?.length) {
      const entry = response.data[0];
      const candidate =
        entry.url ?? entry.image ?? entry.image_base64 ?? entry.b64_json;
      if (candidate) {
        return this.normalizeImage(candidate);
      }
    }

    throw new Error('NanoBanana response missing image payload');
  }

  private normalizeImage(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('http') || trimmed.startsWith('data:image')) {
      return trimmed;
    }
    return `data:image/png;base64,${trimmed}`;
  }

  private getConfig() {
    const config = this.configService.get<AppConfigurationType['ai']>('ai');
    if (!config?.nanoBananaApiKey || !config.nanoBananaEndpoint) {
      throw new Error('NANO_BANANAS_API_KEY or NANO_BANANAS_ENDPOINT missing');
    }

    return {
      nanoBananaApiKey: config.nanoBananaApiKey,
      nanoBananaEndpoint: config.nanoBananaEndpoint,
      nanoBananaModel: config.nanoBananaModel ?? 'nano-banana',
      nanoBananaImageSize: config.nanoBananaImageSize,
      nanoBananaTimeoutMs: config.nanoBananaTimeoutMs ?? 60000,
    };
  }

  private async request<T>(
    endpoint: string,
    body: unknown,
    timeoutMs: number,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getConfig().nanoBananaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NanoBanana error: ${response.status} - ${errorText}`);
    }

    return (await response.json()) as T;
  }
}
