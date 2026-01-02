import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { LlmService } from '@server/llm/llm.service';
import { Job } from 'bullmq';
import { LlmAnalysisPayload, Queues } from '../queues';

@Processor(Queues.LLM_ANALYSIS)
@Injectable()
export class LlmAnalysisConsumer extends WorkerHost {
  constructor(private readonly llmService: LlmService) {
    super();
  }

  async process(job: Job<LlmAnalysisPayload, unknown, string>) {
    return this.llmService.processAnalysis(job.data);
  }
}
