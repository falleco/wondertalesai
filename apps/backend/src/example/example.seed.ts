import { Injectable, Logger } from '@nestjs/common';
import { ExampleService } from './example.service';

@Injectable()
export class ExampleSeed {
  private readonly logger = new Logger(ExampleSeed.name);

  constructor(private readonly service: ExampleService) {}

  async createInitialFixtures() {
    this.logger.log('Example >> Preparing initial fixtures...');
    const existing = await this.service.getByAddress(
      '0x1234567890123456789012345678901234567890',
    );
    if (existing) {
      this.logger.log('Example >> Initial fixtures already created.');
      return;
    }

    await this.service.create({
      address: '0x1234567890123456789012345678901234567890',
    });
    this.logger.log('Example >> Initial fixtures created.');
  }
}
