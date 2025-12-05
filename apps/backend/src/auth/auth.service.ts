import { typeormAdapter } from '@hedystia/better-auth-typeorm';
import { Injectable } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { DataSource } from 'typeorm';

@Injectable()
export class AuthService {
  private auth: ReturnType<typeof betterAuth>;

  constructor(dataSource: DataSource) {
    this.auth = betterAuth({
      basePath: '/api/auth',
      database: typeormAdapter(dataSource),
      // other better-auth options...
      hooks: {}, // minimum required to use hooks. read above for more details.
    });
  }

  getAuth() {
    return this.auth;
  }
}
