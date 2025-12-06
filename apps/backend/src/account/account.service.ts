import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TRPCError } from '@trpc/server';
import { User } from 'better-auth';
import { Repository } from 'typeorm';
import { AccountEntity } from './account.entity';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(AccountEntity)
    private repository: Repository<AccountEntity>,
  ) {}

  public async canUserLogin(userId: AccountEntity['id']) {
    const user = await this.repository.findOne({ where: { id: userId } });
    return !!user?.isActive;
  }

  public async signUpOrSignIn(principal: User) {
    if (!principal.email?.trim()) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Email is required to login or signup',
      });
    }

    const user = await this.repository.findOne({
      where: { email: principal.email.toLowerCase().trim() },
    });

    if (user) {
      return this.login(user.email);
    }
    return this.signup(principal);
  }

  public async login(email: User['email']) {
    if (!email) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Email is required to login',
      });
    }

    const user = await this.repository.findOneByOrFail({
      email: email.toLowerCase().trim(),
    });

    user.lastSeenAt = new Date();
    return this.repository.save(user);
  }

  public async signup(principal: User) {
    if (!principal.email) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Email is required to signup',
      });
    }

    const user = await this.repository.save({
      email: principal.email.toLowerCase().trim(),
      name: principal.name,
      image: principal.image,
      isActive: true,
      lastSeenAt: new Date(),
    });
    return user;
  }
}
