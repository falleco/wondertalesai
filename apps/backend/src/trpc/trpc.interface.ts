import { AnyRouter } from '@trpc/server';

export interface RouterBuilder {
  buildRouter(): AnyRouter;
}
