import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import { PrincipalService } from '@server/auth/principal.service';
import type { Request, Response } from 'express';
import { StoryService } from './story.service';

@Controller('story')
export class StoryController {
  private readonly logger = new Logger(StoryController.name);

  constructor(
    private readonly storyService: StoryService,
    private readonly principalService: PrincipalService,
  ) {}

  @Get('stream')
  async streamStory(
    @Req() req: Request,
    @Res() res: Response,
    @Query('storyId') storyId?: string,
    @Query('choiceId') choiceId?: string,
  ) {
    const user = await this.principalService.getPrincipal(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!storyId) {
      res.status(400).json({ error: 'storyId is required' });
      return;
    }

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const abortController = new AbortController();
    const handleClose = () => abortController.abort();
    req.on('close', handleClose);

    const writeEvent = (payload: unknown) => {
      res.write(`${JSON.stringify(payload)}\n`);
    };

    try {
      const stream = this.storyService.streamPage({
        userId: user.id,
        storyId,
        choiceId: choiceId ?? null,
        abortSignal: abortController.signal,
      });

      for await (const event of stream) {
        if (abortController.signal.aborted) {
          return;
        }
        writeEvent(event);
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        this.logger.warn(`Story stream failed. ${error}`);
        writeEvent({
          type: 'error',
          message: 'Nao foi possivel continuar a historia.',
        });
      }
    } finally {
      req.off('close', handleClose);
      res.end();
    }
  }
}
