import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrpcModule } from '@server/trpc/trpc.module';
import { WorkflowRouterBuilder } from './routers/workflow.router';
import { WorkflowRule } from './entities/workflow-rule.entity';
import { WorkflowTrigger } from './entities/workflow-trigger.entity';
import { WorkflowService } from './services/workflow.service';

@Module({
  imports: [
    forwardRef(() => TrpcModule),
    TypeOrmModule.forFeature([WorkflowRule, WorkflowTrigger]),
  ],
  providers: [WorkflowService, WorkflowRouterBuilder],
  exports: [WorkflowService, WorkflowRouterBuilder],
})
export class WorkflowModule {}
