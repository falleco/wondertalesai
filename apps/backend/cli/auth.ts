import { DataSource } from 'typeorm';
import { betterAuth } from 'better-auth';
import { typeormAdapter } from '@hedystia/better-auth-typeorm';

/**
 *  Add this to the ts config
 *     "module": "es2022",
 *     "moduleResolution": "node",
 */


const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [`${__dirname}/a/**/*.entity{.ts,.js}`],
  migrations: [`${__dirname}/a/migrations/**/*{.ts,.js}`],
  migrationsTableName: 'service_migrations',
  migrationsRun: true,
});

/*await dataSource.initialize();*/

export const auth = betterAuth({
  database: typeormAdapter(dataSource, {
    outputDir: `${__dirname}/src/auth`,
    migrationsDir: `${__dirname}/src/migrations`,

  }),
  plugins: [],
});

export default auth;
