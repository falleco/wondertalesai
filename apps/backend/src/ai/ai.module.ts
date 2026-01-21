import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiEngineService } from './ai-engine.service';
import { NanoBananaProvider } from './providers/nano-banana.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { ReplicateProvider } from './providers/replicate.provider';

@Module({
  providers: [
    AiEngineService,
    AiService,
    OpenAiProvider,
    NanoBananaProvider,
    ReplicateProvider,
  ],
  exports: [AiService],
})
export class AiModule {}
