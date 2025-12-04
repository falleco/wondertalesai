import {
  MessageHandlerErrorBehavior,
  RabbitMQModule,
} from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RabbitMQService } from './rabbitmq.service';

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        return {
          uri: configService.getOrThrow<string>('rabbitmq.url'),
          prefetchCount: 1,
          defaultSubscribeErrorBehavior: MessageHandlerErrorBehavior.NACK,
          connectionManagerOptions: { heartbeatIntervalInSeconds: 5 },
          connectionInitOptions: { wait: true, reject: true, timeout: 5000 },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class RabbitMQModuleExtension {}
