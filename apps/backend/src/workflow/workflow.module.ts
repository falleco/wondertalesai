import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrpcModule } from '@server/trpc/trpc.module';
import { WorkflowRouterBuilder } from './workflow.router';
import { WorkflowService } from './workflow.service';
import { WorkflowRule } from './workflow-rule.entity';
import { WorkflowTrigger } from './workflow-trigger.entity';

@Module({
  imports: [
    forwardRef(() => TrpcModule),
    TypeOrmModule.forFeature([WorkflowRule, WorkflowTrigger]),
  ],
  providers: [WorkflowService, WorkflowRouterBuilder],
  exports: [WorkflowService, WorkflowRouterBuilder],
})
export class WorkflowModule {}
