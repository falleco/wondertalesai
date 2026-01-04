import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { OperationMeta } from './swagger/meta';
import { Context } from './trpc.context';

@Injectable()
export class TrpcService {
  private readonly logger = new Logger(TrpcService.name);

  trpc = initTRPC
    .meta<OperationMeta>()
    .context<Context>()
    .create({
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
