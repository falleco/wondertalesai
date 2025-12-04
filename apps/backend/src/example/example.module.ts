import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQModuleExtension } from '../rabbitmq/rabbitmq.module';
import { ExampleConsumer } from './example.consumer';
import { ExampleController } from './example.controller';
import { ExampleEntity } from './example.entity';
import { ExampleSeed } from './example.seed';
import { ExampleService } from './example.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExampleEntity]), RabbitMQModuleExtension],
  controllers: [ExampleController],
  providers: [ExampleService, ExampleConsumer, ExampleSeed],
  exports: [ExampleService],
})
export class ExampleModule {
  constructor(private readonly seedService: ExampleSeed) {}

  async onModuleInit() {
    await this.seedService.createInitialFixtures();
  }
}
