import { createBetterAuthBaseClientConfig } from "@mailestro/auth/client";
import type { auth } from "@web/auth/server";
import { InferAuth } from "better-auth/client";
import { createAuthClient } from "better-auth/react"; // make sure to import from better-auth/react

export const authClient = createAuthClient({
  ...createBetterAuthBaseClientConfig(),
  basePath: "/api/auth",
  baseURL: "http://localhost:3000",
  $InferAuth: InferAuth<typeof auth>(),
});
