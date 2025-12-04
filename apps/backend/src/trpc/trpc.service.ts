import { Injectable, Logger } from '@nestjs/common';
import { initTRPC } from '@trpc/server';
import { Context } from './trpc.context';
import * as Sentry from '@sentry/node';
import superjson from 'superjson';

@Injectable()
export class TrpcService {
  private readonly logger = new Logger(TrpcService.name);

  trpc = initTRPC.context<Context>().create({
    errorFormatter: ({ shape, error }): unknown => {
      Sentry.captureException(error);
      this.logger.error(error);
      return shape;
    },
    transformer: superjson,
  });

  procedure = this.trpc.procedure;
  router = this.trpc.router;
  mergeRouters = this.trpc.mergeRouters;
}
