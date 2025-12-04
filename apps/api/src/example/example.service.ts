import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from 'viem';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { ExampleEntity } from './example.entity';

@Injectable()
export class ExampleService {
  constructor(
    @InjectRepository(ExampleEntity)
    private readonly exampleRepository: Repository<ExampleEntity>,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async getByAddress(address: Address): Promise<ExampleEntity | null> {
    return this.exampleRepository.findOne({
      where: { address, isActive: true },
    });
  }

  async list(): Promise<ExampleEntity[]> {
    return this.exampleRepository.find({ where: { isActive: true } });
  }

  async create(
    example: Omit<ExampleEntity, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>,
  ): Promise<ExampleEntity> {
    const entity = await this.exampleRepository.save({
      ...example,
      isActive: true,
    });

    return entity;
  }

  async publish(address: ExampleEntity['address']) {
    const entity = await this.exampleRepository.findOne({
      where: { address, isActive: true },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    await this.rabbitMQService.sendToQueue(entity, 'example', 'example');
  }
}
