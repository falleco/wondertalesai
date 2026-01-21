import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfigurationType } from '@server/config/configuration';
import type { AiContext, AiModels, AiProvider } from './ai-provider.interface';
import { NanoBananaProvider } from './providers/nano-banana.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { ReplicateProvider } from './providers/replicate.provider';

@Injectable()
export class AiEngineService {
  constructor(
    private readonly openAiProvider: OpenAiProvider,
    private readonly nanoBananaProvider: NanoBananaProvider,
    private readonly replicateProvider: ReplicateProvider,
    private readonly configService: ConfigService,
  ) {}

  getProvider(_context: AiContext): AiProvider {
    // Placeholder for routing rules (plan, SLA, feature flags).
    return this.getTextProvider(_context);
  }

  getTextProvider(_context: AiContext): AiProvider {
    const config = this.getConfig();
    if (config.replicateApiKey && config.replicateTextModel) {
      return this.replicateProvider;
    }
    return this.openAiProvider;
  }

  getAudioProvider(_context: AiContext): AiProvider {
    const config = this.getConfig();
    if (config.replicateApiKey && config.replicateAudioModel) {
      return this.replicateProvider;
    }
    return this.openAiProvider;
  }

  getImageProvider(_context: AiContext): AiProvider {
    const config = this.getConfig();
    if (config.replicateApiKey && config.replicateImageModel) {
      return this.replicateProvider;
    }
    if (config.nanoBananaApiKey && config.nanoBananaEndpoint) {
      return this.nanoBananaProvider;
    }
    return this.openAiProvider;
  }

  getModels(context: AiContext): AiModels {
    return {
      text: this.getTextProvider(context).getModels().text,
      image: this.getImageProvider(context).getModels().image,
      audio: this.getAudioProvider(context).getModels().audio,
    };
  }

  private getConfig(): AppConfigurationType['ai'] {
    return (
      this.configService.get<AppConfigurationType['ai']>('ai') ??
      ({} as AppConfigurationType['ai'])
    );
  }
}
