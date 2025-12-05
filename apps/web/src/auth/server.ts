import { nextCookies } from "better-auth/next-js";
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";

export const auth = betterAuth({
  basePath: "/api/auth",

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },

  //...your config
  plugins: [nextCookies(), bearer()], // make sure this is the last plugin in the array
  trustedOrigins: ["http://localhost:3000", "http://localhost:4001"],
});
