import { passkeyClient } from '@better-auth/passkey/client';
import { stripeClient } from '@better-auth/stripe/client';
import { type BetterAuthClientOptions } from 'better-auth';
import {
  adminClient,
  magicLinkClient,
  organizationClient,
  twoFactorClient,
} from 'better-auth/client/plugins';

export const createBetterAuthBaseClientConfig = (): BetterAuthClientOptions => {
  return {
    plugins: [
      stripeClient({
        subscription: true, //if you want to enable subscription management
      }),
      organizationClient(),
      adminClient(),
      passkeyClient(),
      twoFactorClient(),
      magicLinkClient(),
    ],
  };
};
