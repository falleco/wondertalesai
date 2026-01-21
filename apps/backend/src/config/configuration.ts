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
    ai: {
      openAiKey: config.LLM_OPEN_AI_KEY,
      openAiBaseUrl: config.LLM_OPEN_AI_BASE_URL,
      openAiTextModel: config.LLM_OPEN_AI_TEXT_MODEL || 'gpt-4o-mini',
      openAiImageModel: config.LLM_OPEN_AI_IMAGE_MODEL || 'gpt-image-1',
      openAiAudioModel: config.LLM_OPEN_AI_AUDIO_MODEL || 'gpt-4o-mini-tts',
      openAiAudioVoice: config.LLM_OPEN_AI_AUDIO_VOICE || 'alloy',
      openAiImageTimeoutMs: config.LLM_OPEN_AI_IMAGE_TIMEOUT_MS
        ? Number.parseInt(config.LLM_OPEN_AI_IMAGE_TIMEOUT_MS, 10)
        : undefined,
      openAiTimeoutMs: config.LLM_OPEN_AI_TIMEOUT_MS
        ? Number.parseInt(config.LLM_OPEN_AI_TIMEOUT_MS, 10)
        : 20000,
      nanoBananaApiKey: config.NANO_BANANAS_API_KEY,
      nanoBananaEndpoint: config.NANO_BANANAS_ENDPOINT,
      nanoBananaModel: config.NANO_BANANAS_MODEL || 'nano-banana',
      nanoBananaImageSize: config.NANO_BANANAS_IMAGE_SIZE,
      nanoBananaTimeoutMs: config.NANO_BANANAS_TIMEOUT_MS
        ? Number.parseInt(config.NANO_BANANAS_TIMEOUT_MS, 10)
        : undefined,
      replicateApiKey: config.REPLICATE_API_TOKEN,
      replicateBaseUrl: config.REPLICATE_BASE_URL,
      replicateTextModel: config.REPLICATE_TEXT_MODEL,
      replicateImageModel: config.REPLICATE_IMAGE_MODEL,
      replicateAudioModel: config.REPLICATE_AUDIO_MODEL,
      replicateAudioVoice: config.REPLICATE_AUDIO_VOICE,
      replicateTimeoutMs: config.REPLICATE_TIMEOUT_MS
        ? Number.parseInt(config.REPLICATE_TIMEOUT_MS, 10)
        : undefined,
      replicatePollIntervalMs: config.REPLICATE_POLL_INTERVAL_MS
        ? Number.parseInt(config.REPLICATE_POLL_INTERVAL_MS, 10)
        : undefined,
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
