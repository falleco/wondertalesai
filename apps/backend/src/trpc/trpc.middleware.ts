import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './trpc.context';
export const t = initTRPC.context<Context>().create();

export const authRequired = t.middleware((opts) => {
  const { ctx } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'This resources requires authentication.',
    });
  }

  return opts.next({
    ctx: {
      user: ctx.user,
    },
  });
});
