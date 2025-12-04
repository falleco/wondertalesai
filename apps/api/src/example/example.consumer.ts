import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Message } from 'amqplib';
import { AppConfigurationType } from '../config/configuration';
import { parseData, shouldDiscard } from '../rabbitmq/rabbitmq.helpers';
import { ExampleEntity } from './example.entity';

@Injectable()
export class ExampleConsumer {
  private logger = new Logger(ExampleConsumer.name);

  config: AppConfigurationType['rabbitmq'];

  constructor(private readonly configService: ConfigService) {
    this.config =
      this.configService.getOrThrow<AppConfigurationType['rabbitmq']>(
        'rabbitmq',
      );
  }

  @RabbitSubscribe({
    exchange: 'example',
    routingKey: 'example',
    queue: 'example',
    queueOptions: {
      // deadLetterExchange: 'example_dlq',
    },
  })
  async handleExample(msg: ExampleEntity, raw: Message) {
    if (shouldDiscard(raw, this.config.maxRetries)) {
      this.logger.warn({ source: 'example.create > discarded', msg });
      return;
    }

    const data = parseData<ExampleEntity>(raw);
    this.logger.log({ source: 'example.create > raw processed', data, msg });
  }
}
