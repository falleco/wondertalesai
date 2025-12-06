import { Inject, Injectable } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { jwt } from 'better-auth/plugins';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
  private auth: ReturnType<typeof betterAuth>;

  constructor(
    @Inject('REDIS_CLIENT')
    readonly redis: Redis,
  ) {
    this.auth = betterAuth({
      basePath: '/api/auth',
      trustedOrigins: ['http://localhost:3000', 'http://localhost:4001'],

      secondaryStorage: {
        get: async (key) => await redis.get(key),
        set: async (key, value, ttl) =>
          await redis.set(key, value, 'EX', ttl ?? 60),
        delete: async (key) => {
          await redis.del(key);
        },
      },

      plugins: [jwt()],

      // other better-auth options...
      hooks: {}, // minimum required to use hooks. read above for more details.
    });
  }

  getAuth() {
    return this.auth;
  }
}
