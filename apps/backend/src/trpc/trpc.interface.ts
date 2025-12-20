import { AnyRouter } from '@trpc/server';

export interface RouterBuilder<TRouter extends AnyRouter = AnyRouter> {
  buildRouter(): TRouter;
}
