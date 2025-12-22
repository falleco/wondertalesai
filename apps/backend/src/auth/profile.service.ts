import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@server/auth/entities/User';
import { Repository } from 'typeorm';

export type UpdateProfileInput = {
  fullName: string;
  image: string | null;
};

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async updateProfile(userId: string, input: UpdateProfileInput) {
    console.log('updateProfile', userId, input);
    await this.userRepository.update(
      { id: userId },
      {
        name: input.fullName,
        image: input.image,
      },
    );

    return await this.userRepository.findOne({
      where: { id: userId },
    });
  }
}
