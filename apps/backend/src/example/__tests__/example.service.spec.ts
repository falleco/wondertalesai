import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { ExampleEntity } from '../example.entity';
import { ExampleService } from '../example.service';

describe('ExampleService', () => {
  let service: ExampleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(ExampleEntity),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: RabbitMQService,
          useValue: {
            sendToQueue: jest.fn(),
          },
        },
        ExampleService,
      ],
    }).compile();

    service = module.get<ExampleService>(ExampleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
