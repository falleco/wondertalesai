import { passkey } from '@better-auth/passkey';
import { stripe } from '@better-auth/stripe';
import { type BetterAuthOptions, BetterAuthPlugin } from 'better-auth';
import { admin, jwt, organization, twoFactor } from 'better-auth/plugins';
import Stripe from 'stripe';

export const createBetterAuthBaseServerConfig = (
  stripeClient: Stripe,
  stripeWebhookSecret: string,
  extraPlugins: BetterAuthPlugin[] = [],
): BetterAuthOptions => {
  return {
    advanced: {
      database: {
        generateId: 'uuid',
      },
    },

    plugins: [
      stripe({
        stripeClient,
        stripeWebhookSecret,
        createCustomerOnSignUp: true,
        schema: {
          user: {
            fields: {
              stripeCustomerId: 'stripe_customer_id',
            },
          },
        },
      }),
      jwt({
        schema: {
          jwks: {
            fields: {
              publicKey: 'public_key',
              privateKey: 'private_key',
              createdAt: 'created_at',
              expiresAt: 'expires_at',
            },
          },
        },
      }),
      organization({
        schema: {
          organization: {
            fields: {
              createdAt: 'created_at',
            },
          },
          invitation: {
            fields: {
              organizationId: 'organization_id',
              inviterId: 'inviter_id',
              expiresAt: 'expires_at',
              createdAt: 'created_at',
            },
          },
          member: {
            fields: {
              organizationId: 'organization_id',
              userId: 'user_id',
              createdAt: 'created_at',
            },
          },
        },
      }),
      twoFactor({
        schema: {
          twoFactor: {
            fields: {
              userId: 'user_id',
              backupCodes: 'backup_codes',
            },
          },
          user: {
            fields: {
              twoFactorEnabled: 'two_factor_enabled',
            },
          },
        },
      }),
      passkey({
        schema: {
          passkey: {
            fields: {
              userId: 'user_id',
              createdAt: 'created_at',
              backedUp: 'backed_up',
              credentialID: 'credential_id',
              deviceType: 'device_type',
              publicKey: 'public_key',
            },
          },
        },
      }),
      admin({
        schema: {
          user: {
            fields: {
              banReason: 'ban_reason',
              banExpires: 'ban_expires',
            },
          },
          session: {
            fields: {
              impersonatedBy: 'impersonated_by',
            },
          },
        },
      }),
      ...extraPlugins,
    ],

    user: {
      fields: {
        emailVerified: 'email_verified',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
      additionalFields: {
        lastSeenAt: {
          type: 'date',
          fieldName: 'last_seen_at',
          required: false,
        },
      },
    },
    account: {
      storeAccountCookie: true,
      fields: {
        accountId: 'account_id',
        providerId: 'provider_id',
        userId: 'user_id',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        idToken: 'id_token',
        accessTokenExpiresAt: 'access_token_expires_at',
        refreshTokenExpiresAt: 'refresh_token_expires_at',
        scope: 'scope',
        password: 'password',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    verification: {
      fields: {
        identifier: 'identifier',
        value: 'value',
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
  };
};
