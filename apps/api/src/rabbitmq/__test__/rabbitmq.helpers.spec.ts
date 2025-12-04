import { Message, XDeath } from 'amqplib';

import { shouldDiscard } from '../rabbitmq.helpers';

describe('shouldDiscard', () => {
  it('should return true', () => {
    const dt: XDeath = {
      count: 200,
      reason: 'rejected',
      queue: 'any',
      exchange: 'any',
      time: {
        '!': 'timestamp',
        value: 2,
      },
      'routing-keys': [],
    };

    const msg: Message = {
      properties: {
        headers: { 'x-death': [dt] },
        contentType: 'any',
        contentEncoding: 'any',
        deliveryMode: 'any',
        priority: 'any',
        correlationId: 'any',
        replyTo: 'any',
        expiration: 'any',
        messageId: 'any',
        timestamp: 'any',
        type: 'any',
        userId: 'any',
        appId: 'any',
        clusterId: 'any',
      },
      content: Buffer.from('teste'),
      fields: {
        deliveryTag: 10,
        exchange: 'any',
        redelivered: true,
        routingKey: 'any',
      },
    };

    const res = shouldDiscard(msg, 10);
    expect(res).toBeTruthy();
  });

  it('should return false', () => {
    const dt: XDeath = {
      count: 10,
      reason: 'rejected',
      queue: 'any',
      exchange: 'any',
      time: {
        '!': 'timestamp',
        value: 2,
      },
      'routing-keys': [],
    };

    const msg: Message = {
      properties: {
        headers: { 'x-death': [dt] },
        contentType: 'any',
        contentEncoding: 'any',
        deliveryMode: 'any',
        priority: 'any',
        correlationId: 'any',
        replyTo: 'any',
        expiration: 'any',
        messageId: 'any',
        timestamp: 'any',
        type: 'any',
        userId: 'any',
        appId: 'any',
        clusterId: 'any',
      },
      content: Buffer.from('teste'),
      fields: {
        deliveryTag: 10,
        exchange: 'any',
        redelivered: true,
        routingKey: 'any',
      },
    };

    const res = shouldDiscard(msg, 100);
    expect(res).toBeFalsy();
  });
});
