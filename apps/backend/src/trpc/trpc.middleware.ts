import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './trpc.context';
export const t = initTRPC.context<Context>().create();

export const authRequired = t.middleware((opts) => {
  const { ctx } = opts;
  console.log('authRequired middleware called');

  if (!ctx.user) {
    console.log('user not found');
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  console.log('user found');

  return opts.next({
    ctx: {
      user: ctx.user,
    },
  });
});
