import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { AppConfigurationType } from './configuration';

@Injectable()
export class TypeOrmConfigFactory implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  async createTypeOrmOptions(): Promise<TypeOrmModuleOptions> {
    const dbConfig =
      this.configService.getOrThrow<AppConfigurationType['database']>(
        'database',
      );

    const master = {
      url: dbConfig.url,
    };

    const replicaSet = dbConfig.replicas.map((replica) => ({
      url: replica,
    }));

    return {
      ...(!replicaSet.length && {
        ...master,
      }),
      ...(replicaSet.length && {
        replication: {
          // Use first replica as master as for now API doesn't perform write queries.
          // If master or any replica is down the app won't start.

          // Traffic is randomly distributed across replica set for read queries.
          // There is no replica failure tolerance by typeOrm, it keeps sending traffic to a replica even if it is down.
          // Health check verifies master only, there is no way to get a connection for a specific replica from typeOrm.
          master,
          slaves: replicaSet,
        },
      }),
      type: 'postgres',
      url: dbConfig?.url,
      entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
      migrations: [`${__dirname}/../migrations/**/*{.ts,.js}`],
      migrationsTableName: 'service_migrations',
      autoLoadEntities: true,
      synchronize: false,
    };
  }
}
