import { Injectable } from '@nestjs/common';
import { AiEngineService } from './ai-engine.service';
import type {
  AiAudioRequest,
  AiAudioResponse,
  AiContext,
  AiImageRequest,
  AiImageResponse,
  AiModels,
  AiTextRequest,
  AiTextResponse,
  AiTextStreamRequest,
  AiTextStreamResponse,
} from './ai-provider.interface';

@Injectable()
export class AiService {
  constructor(private readonly engine: AiEngineService) {}

  getModels(context: AiContext): AiModels {
    return this.engine.getModels(context);
  }

  async generateText(
    request: AiTextRequest,
    context: AiContext,
  ): Promise<AiTextResponse> {
    return await this.engine
      .getTextProvider(context)
      .generateText(request, context);
  }

  async streamText(
    request: AiTextStreamRequest,
    context: AiContext,
  ): Promise<AiTextStreamResponse> {
    const provider = this.engine.getTextProvider(context);
    if (provider.streamText) {
      return provider.streamText(request, context);
    }

    const fallback = async function* () {
      const result = await provider.generateText(request, context);
      yield result.text;
    };

    return fallback();
  }

  async generateImage(
    request: AiImageRequest,
    context: AiContext,
  ): Promise<AiImageResponse> {
    return await this.engine
      .getImageProvider(context)
      .generateImage(request, context);
  }

  async generateAudio(
    request: AiAudioRequest,
    context: AiContext,
  ): Promise<AiAudioResponse> {
    return await this.engine
      .getAudioProvider(context)
      .generateAudio(request, context);
  }
}
