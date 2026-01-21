import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '@server/ai/ai.module';
import { AuthModule } from '@server/auth/auth.module';
import { TrpcModule } from '@server/trpc/trpc.module';
import { StoryController } from './story.controller';
import { Story } from './story.entity';
import { StoryRouterBuilder } from './story.router';
import { StoryService } from './story.service';
import { StoryAiService } from './story-ai.service';
import { StoryPage } from './story-page.entity';

@Module({
  imports: [
    AiModule,
    forwardRef(() => AuthModule),
    forwardRef(() => TrpcModule),
    TypeOrmModule.forFeature([Story, StoryPage]),
  ],
  controllers: [StoryController],
  providers: [StoryService, StoryAiService, StoryRouterBuilder],
  exports: [StoryRouterBuilder],
})
export class StoryModule {}
