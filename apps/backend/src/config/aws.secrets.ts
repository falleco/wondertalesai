import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { AwsCredentialIdentity } from '@aws-sdk/types';

interface AwsSecrets {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export const fetchAWSSecrets = async (secretName: string, aws: AwsSecrets) => {
  let credentials: AwsCredentialIdentity | undefined;
  if (aws.accessKeyId && aws.secretAccessKey) {
    credentials = {
      accessKeyId: aws.accessKeyId,
      secretAccessKey: aws.secretAccessKey,
    };
  }

  const client = new SecretsManagerClient({
    region: aws.region,
    credentials,
  });

  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: secretName,
    }),
  );
  return JSON.parse(response.SecretString ?? '{}');
};
