import { createBetterAuthBaseServerConfig } from '@mailestro/auth/server';
import { Injectable } from '@nestjs/common';
import { RedisService } from '@server/redis/redis.service';
import { betterAuth } from 'better-auth';
import Stripe from 'stripe';

const stripeClient = new Stripe('a', {
  apiVersion: '2025-11-17.clover', // Latest API version as of Stripe SDK v20.0.0
});

@Injectable()
export class AuthService {
  private auth: ReturnType<typeof betterAuth>;

  constructor(private readonly redisService: RedisService) {
    const redis = this.redisService.redis;

    this.auth = betterAuth({
      ...createBetterAuthBaseServerConfig(
        stripeClient,
        process.env.STRIPE_WEBHOOK_SECRET as string,
        [],
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
