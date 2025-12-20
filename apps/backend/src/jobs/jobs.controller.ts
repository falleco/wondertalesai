import { Controller, Post } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @AllowAnonymous()
  @Post('dummy')
  async addDummyJob() {
    return this.jobsService.addDummyJob();
  }
}
