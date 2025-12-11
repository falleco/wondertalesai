import * as Sentry from '@sentry/node';
import * as trpcNext from '@trpc/server/adapters/express';
import { PrincipalService } from '../auth/principal.service';

export const generateInjectedContext = (principalService: PrincipalService) => {
  const createContext = async ({
    req,
  }: trpcNext.CreateExpressContextOptions) => {
    // Create your context based on the request object
    // Will be available as `ctx` in all your resolvers
    // This is just an example of something you might want to do in your ctx fn
    async function getUserFromHeader() {
      if (req.headers.cookie) {
        const principal = await principalService.getPrincipal(req);

        if (!principal) {
          return null;
        }

        return {
          id: principal.id,
          email: principal.email,
          emailVerified: principal.emailVerified,
          name: principal.name,
          image: principal.image,
          createdAt: principal.createdAt,
          updatedAt: principal.updatedAt,
        };
      }
      return null;
    }
    const user = await getUserFromHeader();

    // identify the user on sentry on each request
    Sentry.setUser({
      id: user?.id,
      email: user?.email,
      name: user?.name,
      image: user?.image,
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
