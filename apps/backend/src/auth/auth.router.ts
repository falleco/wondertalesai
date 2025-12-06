import { Injectable } from '@nestjs/common';
import { RouterBuilder } from '@server/trpc/trpc.interface';
import { authRequired } from '@server/trpc/trpc.middleware';
import { TrpcService } from '@server/trpc/trpc.service';

@Injectable()
export class AuthRouterBuilder implements RouterBuilder {
  constructor(private readonly trpc: TrpcService) {}

  public buildRouter() {
    return this.trpc.router({
      me: this.trpc.procedure.use(authRequired).query(({ ctx }) => {
        return ctx.user;
      }),
    });
  }
}
