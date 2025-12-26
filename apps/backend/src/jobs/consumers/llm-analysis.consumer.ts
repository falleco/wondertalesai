import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { IntegrationsService } from '@server/integrations/integrations.service';
import { Job } from 'bullmq';
import { LlmAnalysisPayload, Queues } from '../queues';

@Processor(Queues.LLM_ANALYSIS)
@Injectable()
export class LlmAnalysisConsumer extends WorkerHost {
  constructor(private readonly integrationsService: IntegrationsService) {
    super();
  }

  async process(job: Job<LlmAnalysisPayload, unknown, string>) {
    return this.integrationsService.processLlmAnalysis(job.data);
  }
}
