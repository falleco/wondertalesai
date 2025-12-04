import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RabbitMQService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  public sendToQueue(message: unknown, exchange: string, routingKey?: string) {
    return this.amqpConnection.publish(
      exchange,
      routingKey || exchange,
      message,
    );
  }

  public publishToTopic(
    message: unknown,
    routingKey: string,
    exchange?: string,
  ) {
    return this.amqpConnection.publish(
      exchange || 'amq.topic',
      routingKey,
      message,
    );
  }
}
