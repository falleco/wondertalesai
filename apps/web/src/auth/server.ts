import { redis } from "@web/lib/redis";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";

export const auth = betterAuth({
  basePath: "/api/auth",

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },

  secondaryStorage: {
    get: async (key) => await redis.get(key),
    set: async (key, value, ttl) =>
      await redis.set(key, value, "EX", ttl ?? 60),
    delete: async (key) => {
      await redis.del(key);
    },
  },

  account: {
    storeAccountCookie: true,
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
  },

  plugins: [jwt(), nextCookies()], // make sure this is the last plugin in the array
  trustedOrigins: ["http://localhost:3000", "http://localhost:4001"],

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // só age no callback / sign in concluído
      if (!ctx.path.startsWith("/callback/")) return;

      const newSession = ctx.context.newSession ?? ctx.context.session;
      if (!newSession) return;

      // sendMessage("signInOrSignUp", {
      //   session: newSession.session,
      //   user: newSession.user,
      // });

      // const user = newSession.user;

      // // 1) nome do cookie de sessão do Better Auth
      // const sessionCookieName = ctx.context.authCookies.sessionToken.name; //  [oai_citation:0‡Better Auth](https://www.better-auth.com/docs/concepts/hooks)

      // // 2) valor da sessão (token). Em stateless é o que vai dentro do cookie
      // const sessionToken = newSession.session.token;

      // // 3) monta um Cookie header manualmente
      // const cookieHeader = `${sessionCookieName}=${sessionToken}`;

      // ctx.setSignedCookie(sessionCookieName, sessionToken, process.env.BETTER_AUTH_SECRET as string);
      // console.log("cookieHeader", cookieHeader);

      // const isOauthCallback =
      //   ctx.path.startsWith("/callback/") ||
      //   ctx.path.startsWith("/sign-in/oauth");

      // if (!isOauthCallback) return;

      // const session = ctx.context.newSession ?? ctx.context.session;
      // if (!session) return;

      // const cookies = ctx.request?.headers.get('cookie');
      // console.log("cookies", cookies);

      // setTimeout(async () => {
      //   const account = await trpc.account.signUpOrSignIn.mutate();
      //   console.log("account", account);
      // }, 1000);
      // const session = ctx.context.newSession ?? ctx.context.session;
      // console.log("current session", ctx.path, session);
      // if (ctx.path.startsWith("/sign-up")) {
      //   console.log(
      //     "user registered",
      //     ctx.context.session,
      //     ctx.context.newSession,
      //   );
      // } else if (ctx.path.startsWith("/sign-in")) {
      //   console.log(
      //     "user logged in",
      //     ctx.context.session,
      //     ctx.context.newSession,
      //   );
      // }
    }),
  },
});
