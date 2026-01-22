import { createBetterAuthBaseClientConfig } from "@dreamtalesai/auth/client";
import type { auth } from "@web/auth/server";
import { InferAuth } from "better-auth/client";
import { createAuthClient } from "better-auth/react"; // make sure to import from better-auth/react

const baseClientConfig = createBetterAuthBaseClientConfig();

type AuthOptions = ReturnType<typeof InferAuth<typeof auth>>;

type AuthClientOptions = typeof baseClientConfig & {
  basePath: string;
  baseURL: string;
  $InferAuth: AuthOptions;
};

export const authClient = createAuthClient<AuthClientOptions>({
  ...baseClientConfig,
  basePath: "/api/auth",
  baseURL: "http://localhost:3000",
  $InferAuth: InferAuth<typeof auth>(),
});
