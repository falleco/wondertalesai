import * as trpcNext from '@trpc/server/adapters/express';
import * as Sentry from '@sentry/node';
import { PrincipalService } from './principal.service';

export const generateInjectedContext = (principalService: PrincipalService) => {
  const createContext = async ({
    req,
  }: trpcNext.CreateExpressContextOptions) => {
    // Create your context based on the request object
    // Will be available as `ctx` in all your resolvers
    // This is just an example of something you might want to do in your ctx fn
    async function getUserFromHeader() {
      if (req.headers.authorization) {
        const result = await principalService.getAccounts(req);
        const user = result.accounts[0];

        return {
          id: user.id,
          providerId: user.providerId,
          accountId: user.accountId,
          userId: user.userId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      }
      return null;
    }
    const user = await getUserFromHeader();

    // identify the user on sentry on each request
    Sentry.setUser({
      id: user?.id,
      // email: user?.email,
      // username: user?.email,
      // displayName: user?.name,
    });

    return {
      user,
    };
  };

  return createContext;
};

export type Context = Awaited<
  ReturnType<ReturnType<typeof generateInjectedContext>>
>;
