import { createBetterAuthBaseServerConfig } from '@mailestro/auth/server';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type AppConfigurationType } from '@server/config/configuration';
import { JobsService } from '@server/jobs/jobs.service';
import { RedisService } from '@server/redis/redis.service';
import { betterAuth } from 'better-auth';
import Stripe from 'stripe';

const stripeClient = new Stripe('a', {
  apiVersion: '2025-11-17.clover', // Latest API version as of Stripe SDK v20.0.0
});

@Injectable()
export class AuthService {
  private auth: ReturnType<typeof betterAuth>;

  constructor(
    private readonly redisService: RedisService,
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService<AppConfigurationType>,
  ) {
    const redis = this.redisService.redis;

    this.auth = betterAuth({
      ...createBetterAuthBaseServerConfig(
        stripeClient,
        process.env.STRIPE_WEBHOOK_SECRET as string,
        [],
        {
          sendMagicLink: async (email: string, token: string, url: string) => {
            const emailConfig =
              this.configService.get<AppConfigurationType['email']>('email');
            const templateId = emailConfig?.templates?.magicLink;
            if (!templateId) {
              throw new Error('Config key missing: email.templates.magicLink');
            }
            await this.jobsService.enqueueEmail({
              templateId,
              to: email,
              payload: { email, token, url },
            });
          },
        },
      ),
      basePath: '/api/auth',
      trustedOrigins: ['http://localhost:3000', 'http://localhost:4001'],

      secondaryStorage: {
        get: async (key: string) => await redis.get(key),
        set: async (key: string, value: string, ttl: number) =>
          await redis.set(key, value, 'EX', ttl ?? 60),
        delete: async (key: string) => {
          await redis.del(key);
        },
      },
      hooks: {}, // minimum required to use hooks. read above for more details.
    });
  }

  getAuth() {
    return this.auth;
  }
}
