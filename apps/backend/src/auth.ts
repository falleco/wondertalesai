import { betterAuth } from "better-auth";

export const auth = betterAuth({
  basePath: "/api/auth",
  // other better-auth options...
  hooks: {}, // minimum required to use hooks. read above for more details.
});