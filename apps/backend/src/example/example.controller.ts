import { Controller, Get, Param, Post } from '@nestjs/common';
import { Address } from 'viem';
import { ExampleEntity } from './example.entity';
import { ExampleService } from './example.service';

@Controller('example')
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}
  @Get()
  async list(): Promise<ExampleEntity[]> {
    return this.exampleService.list();
  }

  @Get(':address')
  async getByAddress(@Param('address') address: Address) {
    return this.exampleService.getByAddress(address);
  }

  @Post(':address')
  async publish(@Param('address') address: Address) {
    this.exampleService.publish(address);
    return { message: 'ok' };
  }
}
