import { fetchAWSSecrets } from './aws.secrets';

/**
 * Hard limit for the number of replicas that we will look for.
 */
const MAX_NUMBER_OF_REPLICAS = 10;

/**
 * Get the replica configuration from the environment variables, if any
 *
 * @returns An array of replica URLs.
 */
const getReplicaConfig = () => {
  const useReplicas = process.env.DATABASE_USE_REPLICAS === 'true';
  const replicas: string[] = [];
  if (useReplicas) {
    for (let i = 0; i < MAX_NUMBER_OF_REPLICAS; i++) {
      const replicaURL = process.env[`DATABASE_REPLICA_URL_${i}`];
      if (!replicaURL) {
        break;
      }
      replicas.push(replicaURL);
    }
  }
  return replicas;
};

/**
 * Get the application configuration from the environment variables.
 *
 * @returns The application configuration.
 */
export const GetAppConfiguration = async () => {
  const awsSecrets = process.env.AWS_SECRET_NAME
    ? await fetchAWSSecrets(process.env.AWS_SECRET_NAME, {
        region: process.env.AWS_REGION ?? '',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      })
    : {};

  const config = {
    ...awsSecrets,
    ...process.env,
  };

  return {
    port: config.PORT ? Number.parseInt(config.PORT, 10) : 4001,
    bind: config.BIND_ADDR || '0.0.0.0',
    pathPrefix: config.PATH_PREFIX || '',
    app: {
      baseUrl: config.APP_BASE_URL || '',
    },
    swagger: {
      enabled: config.FEATURE_SWAGGER_ENABLED === 'true',
    },
    cors: config.CORS_URL || '*',
    database: {
      url: config.DATABASE_URL,
      replicas: getReplicaConfig(),
      poolSize: Number.parseInt(config.DATABASE_CONNECTION_POOL_SIZE, 10) || 50,
    },
    jwt: {
      issuer: config.JWT_ISSUER,
      jwksUri: config.JWKS_URI,
    },
    rabbitmq: {
      url: config.RABBITMQ_URL,
      maxRetries: 10,
    },
    redis: {
      url: config.REDIS_URL,
      ttl: 60, // 1 minute cache
    },
    email: {
      apiKey: config.SENDGRID_API_KEY,
      fromEmail: config.SENDGRID_FROM_EMAIL,
      fromName: config.SENDGRID_FROM_NAME,
      templates: {
        magicLink: config.SENDGRID_MAGIC_LINK_TEMPLATE_ID,
      },
    },
  };
};

/**
 * Configuration type for typesafety across the codebase
 */
export type AppConfigurationType = Awaited<
  ReturnType<typeof GetAppConfiguration>
>;
