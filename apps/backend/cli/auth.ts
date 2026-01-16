import { createBetterAuthBaseServerConfig } from '@dreamtalesai/auth/server';
import { typeormAdapter } from '@hedystia/better-auth-typeorm';
import { betterAuth } from 'better-auth';
import Stripe from 'stripe';
import { DataSource } from 'typeorm';

const stripeClient = new Stripe('a', {
  apiVersion: '2025-11-17.clover', // Latest API version as of Stripe SDK v20.0.0
});

/**
 *  Add this to the ts config
 *     "module": "es2022",
 *     "moduleResolution": "node",
 */

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [`${__dirname}/../**/entities/*.{.ts,.js}`],
  migrations: [`${__dirname}/../migrations/**/*{.ts,.js}`],
  migrationsTableName: 'nothing',
  migrationsRun: false,
});

// await dataSource.initialize();

export const auth = betterAuth({
  ...createBetterAuthBaseServerConfig(stripeClient, 'b'),
  database: typeormAdapter(dataSource, {
    outputDir: `${__dirname}/../src/auth`,
    migrationsDir: `${__dirname}/../src/migrations`,
  }),

  secondaryStorage: {
    get: async (_key: string) => null,
    set: async (_key: string, _value: string, _ttl: number) => {},
    delete: async (_key: string) => {},
  },
});

export default auth;
