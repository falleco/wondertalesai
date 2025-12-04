import { Message } from 'amqplib';

export function shouldDiscard(msg: Message, discardcount: number) {
  if (msg.properties?.headers?.['x-death']) {
    if (
      Array.isArray(msg.properties.headers['x-death']) &&
      msg.properties.headers['x-death'].length > 0
    ) {
      if (msg.properties.headers['x-death'][0].count > discardcount) {
        return true;
      }
    }
  }

  return false;
}

export function parseData<T>(raw: Message) {
  return JSON.parse(raw.content.toString()) as T;
}
