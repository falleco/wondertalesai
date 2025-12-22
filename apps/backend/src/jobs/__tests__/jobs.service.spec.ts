import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from '../jobs.service';
import { Queues } from '../queues';

describe('JobsService', () => {
  let service: JobsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: getQueueToken(Queues.DUMMY),
          useValue: { add: jest.fn() },
        },
        {
          provide: getQueueToken(Queues.EMAIL),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
