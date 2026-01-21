import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsyncQueue } from './async-queue';
import type { StorySeed } from './story.entity';
import { Story } from './story.entity';
import { StoryAiService } from './story-ai.service';
import { StoryPage } from './story-page.entity';
import { StoryTextSegmenter, type TextSegment } from './text-segmenter';

type StoryStreamEvent =
  | {
      type: 'start';
      pageNumber: number;
      models: { text: string; image: string; audio: string };
    }
  | { type: 'llm_token'; text: string }
  | {
      type: 'text_segment';
      id: string;
      sequenceNumber: number;
      text: string;
    }
  | {
      type: 'audio_chunk';
      sequenceNumber: number;
      audioFormat: string;
      data: string;
    }
  | { type: 'audio_end'; sequenceNumber: number }
  | {
      type: 'complete';
      page: StoryPage | null;
      story: Story;
      isEnd: boolean;
      titleOptions: string[];
      models: { text: string; image: string; audio: string };
    }
  | { type: 'error'; message: string };

type StoryCompleteEvent = Extract<StoryStreamEvent, { type: 'complete' }>;

@Injectable()
export class StoryService {
  private logger = new Logger(StoryService.name);

  constructor(
    @InjectRepository(Story)
    private readonly storyRepository: Repository<Story>,
    @InjectRepository(StoryPage)
    private readonly pageRepository: Repository<StoryPage>,
    private readonly storyAiService: StoryAiService,
  ) {}

  async listStories(userId: string) {
    const stories = await this.storyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!stories.length) {
      return [];
    }

    const counts = await this.pageRepository
      .createQueryBuilder('page')
      .select('page.story_id', 'storyId')
      .addSelect('COUNT(page.id)', 'count')
      .where('page.story_id IN (:...ids)', {
        ids: stories.map((story) => story.id),
      })
      .groupBy('page.story_id')
      .getRawMany<{ storyId: string; count: string }>();

    const countMap = new Map(
      counts.map((entry) => [entry.storyId, Number(entry.count)]),
    );

    return stories.map((story) => ({
      id: story.id,
      title: story.title,
      theme: story.theme,
      status: story.status,
      coverImageUrl: story.coverImageUrl,
      createdAt: story.createdAt,
      pageCount: countMap.get(story.id) ?? 0,
    }));
  }

  async startStory(userId: string) {
    const theme = this.storyAiService.pickTheme();
    const seed = this.storyAiService.createSeed(theme);

    const story = this.storyRepository.create({
      userId,
      theme,
      status: 'in_progress',
      title: null,
      coverImageUrl: null,
      seed,
      titleOptions: null,
    });

    const savedStory = await this.storyRepository.save(story);

    return { story: savedStory };
  }

  async createStory(userId: string) {
    const theme = this.storyAiService.pickTheme();
    const seed = this.storyAiService.createSeed(theme);

    const story = this.storyRepository.create({
      userId,
      theme,
      status: 'in_progress',
      title: null,
      coverImageUrl: null,
      seed,
      titleOptions: null,
    });
    const savedStory = await this.storyRepository.save(story);

    const draft = await this.storyAiService.generatePage({
      userId,
      seed,
      theme,
      pageNumber: 1,
    });

    const page = this.pageRepository.create({
      storyId: savedStory.id,
      pageNumber: 1,
      text: draft.text,
      imageUrl: draft.imageUrl,
      audioUrl: draft.audioUrl,
      imagePrompt: draft.imagePrompt,
      audioPrompt: draft.audioPrompt,
      choices: draft.choices,
    });

    const savedPage = await this.pageRepository.save(page);

    if (!savedStory.coverImageUrl && draft.imageUrl) {
      savedStory.coverImageUrl = draft.imageUrl;
      await this.storyRepository.save(savedStory);
    }

    return {
      story: savedStory,
      page: savedPage,
      models: draft.models,
    };
  }

  async getStory(userId: string, storyId: string) {
    const story = await this.storyRepository.findOne({
      where: { id: storyId, userId },
    });

    if (!story) {
      throw new Error('Story not found');
    }

    const pages = await this.pageRepository.find({
      where: { storyId: story.id },
      order: { pageNumber: 'ASC', createdAt: 'ASC' },
    });

    return { story, pages };
  }

  async choosePath(input: {
    userId: string;
    storyId: string;
    choiceId: string;
  }) {
    const { story, pages } = await this.getStory(input.userId, input.storyId);

    if (story.status === 'completed' || story.status === 'awaiting_title') {
      return {
        story,
        page: null,
        isEnd: true,
        titleOptions: story.titleOptions ?? [],
      };
    }

    const lastPage = pages[pages.length - 1];
    const pageNumber = (lastPage?.pageNumber ?? 0) + 1;
    const choiceText =
      lastPage?.choices.find((choice) => choice.id === input.choiceId)?.text ??
      null;

    const seed = story.seed ?? this.storyAiService.createSeed(story.theme);
    if (!story.seed) {
      story.seed = seed;
      await this.storyRepository.save(story);
    }

    const draft = await this.storyAiService.generatePage({
      userId: input.userId,
      seed,
      theme: story.theme,
      pageNumber,
      choiceText,
    });

    const newPage = this.pageRepository.create({
      storyId: story.id,
      pageNumber,
      text: draft.text,
      imageUrl: draft.imageUrl,
      audioUrl: draft.audioUrl,
      imagePrompt: draft.imagePrompt,
      audioPrompt: draft.audioPrompt,
      choices: draft.choices,
    });

    const savedPage = await this.pageRepository.save(newPage);

    const maxPages = this.storyAiService.getMaxPages();
    if (pageNumber >= maxPages) {
      const titleOptions = await this.storyAiService.generateTitleOptions(
        input.userId,
        seed,
        story.theme,
      );
      story.status = 'awaiting_title';
      story.titleOptions = titleOptions.titles;
      story.seed = seed;
      if (!story.coverImageUrl && draft.imageUrl) {
        story.coverImageUrl = draft.imageUrl;
      }
      await this.storyRepository.save(story);

      return {
        story,
        page: savedPage,
        isEnd: true,
        titleOptions: titleOptions.titles,
        models: draft.models,
      };
    }

    return {
      story,
      page: savedPage,
      isEnd: false,
      titleOptions: [],
      models: draft.models,
    };
  }

  async *streamPage(input: {
    userId: string;
    storyId: string;
    choiceId?: string | null;
    abortSignal?: AbortSignal;
  }): AsyncGenerator<StoryStreamEvent> {
    if (input.abortSignal?.aborted) {
      return;
    }
    const { story, pages } = await this.getStory(input.userId, input.storyId);
    const models = this.storyAiService.getModelsForUser(input.userId);

    if (story.status === 'completed' || story.status === 'awaiting_title') {
      yield {
        type: 'complete',
        page: null,
        story,
        isEnd: true,
        titleOptions: story.titleOptions ?? [],
        models,
      };
      return;
    }

    const lastPage = pages[pages.length - 1];
    const pageNumber = (lastPage?.pageNumber ?? 0) + 1;
    const choiceText =
      input.choiceId && lastPage
        ? (lastPage.choices.find((choice) => choice.id === input.choiceId)
            ?.text ?? null)
        : null;

    if (pages.length > 0 && !input.choiceId) {
      throw new Error('Choice is required to continue the story');
    }

    const seed = story.seed ?? this.storyAiService.createSeed(story.theme);
    if (!story.seed) {
      story.seed = seed;
      await this.storyRepository.save(story);
    }

    const outputQueue = new AsyncQueue<StoryStreamEvent>();
    const segmentQueue = new AsyncQueue<TextSegment>();
    const segmenter = new StoryTextSegmenter();

    const pushSegment = (segment: TextSegment) => {
      outputQueue.push({
        type: 'text_segment',
        id: segment.id,
        sequenceNumber: segment.sequenceNumber,
        text: segment.text,
      });
      segmentQueue.push(segment);
    };

    const handleAbort = () => {
      segmentQueue.close();
      outputQueue.close();
    };

    input.abortSignal?.addEventListener('abort', handleAbort);

    const ttsTask = (async () => {
      for await (const segment of segmentQueue) {
        if (input.abortSignal?.aborted) return;
        try {
          for await (const chunk of this.storyAiService.streamAudioChunks({
            userId: input.userId,
            text: segment.text,
            abortSignal: input.abortSignal,
          })) {
            if (input.abortSignal?.aborted) return;
            outputQueue.push({
              type: 'audio_chunk',
              sequenceNumber: segment.sequenceNumber,
              audioFormat: chunk.format,
              data: chunk.data,
            });
          }
        } catch (error) {
          if (!input.abortSignal?.aborted) {
            this.logger.warn(`TTS segment failed. ${error}`);
          }
        } finally {
          if (!input.abortSignal?.aborted) {
            outputQueue.push({
              type: 'audio_end',
              sequenceNumber: segment.sequenceNumber,
            });
          }
        }
      }
    })();

    const llmTask = (async () => {
      outputQueue.push({
        type: 'start',
        pageNumber,
        models,
      });

      if (input.abortSignal?.aborted) {
        return;
      }

      let storyText = '';
      let streamFailed = false;

      try {
        const stream = this.storyAiService.streamStoryText({
          userId: input.userId,
          seed,
          theme: story.theme,
          pageNumber,
          choiceText,
          abortSignal: input.abortSignal,
        });

        for await (const chunk of stream) {
          if (input.abortSignal?.aborted) {
            return;
          }
          if (chunk) {
            storyText += chunk;
            outputQueue.push({ type: 'llm_token', text: chunk });
            const segments = segmenter.push(chunk);
            segments.forEach(pushSegment);
          }
        }
      } catch (error) {
        if (input.abortSignal?.aborted) {
          return;
        }
        streamFailed = true;
        this.logger.warn(`Streaming failed, using fallback. ${error}`);
      }

      if (input.abortSignal?.aborted) {
        return;
      }

      if (!storyText.trim() || streamFailed) {
        const draft = await this.storyAiService.generatePage({
          userId: input.userId,
          seed,
          theme: story.theme,
          pageNumber,
          choiceText,
        });

        if (draft.text) {
          storyText = draft.text;
          outputQueue.push({ type: 'llm_token', text: draft.text });
          const fallbackSegmenter = new StoryTextSegmenter();
          const fallbackSegments = fallbackSegmenter
            .push(draft.text)
            .concat(fallbackSegmenter.flush());
          fallbackSegments.forEach(pushSegment);
        }

        segmentQueue.close();

        const savedPage = await this.pageRepository.save(
          this.pageRepository.create({
            storyId: story.id,
            pageNumber,
            text: storyText,
            imageUrl: draft.imageUrl,
            audioUrl: draft.audioUrl,
            imagePrompt: draft.imagePrompt,
            audioPrompt: draft.audioPrompt,
            choices: draft.choices,
          }),
        );

        const result = await this.finishStream({
          story,
          page: savedPage,
          userId: input.userId,
          seed,
          models: draft.models,
        });

        outputQueue.push(result);
        return;
      }

      const remainingSegments = segmenter.flush();
      remainingSegments.forEach(pushSegment);
      segmentQueue.close();

      const metadata = await this.storyAiService.generatePageMetadata({
        userId: input.userId,
        seed,
        theme: story.theme,
        pageNumber,
        storyText,
        choiceText,
      });

      const savedPage = await this.pageRepository.save(
        this.pageRepository.create({
          storyId: story.id,
          pageNumber,
          text: storyText,
          imageUrl: null,
          audioUrl: null,
          imagePrompt: metadata.imagePrompt,
          audioPrompt: metadata.audioPrompt,
          choices: metadata.choices,
        }),
      );

      const result = await this.finishStream({
        story,
        page: savedPage,
        userId: input.userId,
        seed,
        models,
      });

      outputQueue.push(result);
    })();

    void Promise.allSettled([llmTask, ttsTask]).finally(() => {
      segmentQueue.close();
      outputQueue.close();
    });

    try {
      for await (const event of outputQueue) {
        if (input.abortSignal?.aborted) {
          return;
        }
        yield event;
      }
    } finally {
      input.abortSignal?.removeEventListener('abort', handleAbort);
    }
  }

  async generatePageMedia(input: {
    userId: string;
    storyId: string;
    pageId: string;
  }) {
    const story = await this.storyRepository.findOne({
      where: { id: input.storyId, userId: input.userId },
    });

    if (!story) {
      throw new Error('Story not found');
    }

    const page = await this.pageRepository.findOne({
      where: { id: input.pageId, storyId: story.id },
    });

    if (!page) {
      throw new Error('Story page not found');
    }

    const needsMedia =
      !page.imageUrl ||
      !page.audioUrl ||
      page.choices.some((choice) => !choice.imageUrl);

    if (!needsMedia) {
      return { story, page, models: null };
    }

    const media = await this.storyAiService.generateMedia({
      userId: input.userId,
      theme: story.theme,
      pageNumber: page.pageNumber,
      text: page.text,
      imagePrompt: page.imagePrompt,
      audioPrompt: page.audioPrompt,
      imageUrl: page.imageUrl,
      audioUrl: page.audioUrl,
      choices: page.choices,
    });

    page.imageUrl = media.imageUrl;
    page.audioUrl = media.audioUrl;
    page.choices = media.choices;

    const savedPage = await this.pageRepository.save(page);

    let savedStory = story;
    if (!story.coverImageUrl && savedPage.imageUrl && page.pageNumber === 1) {
      story.coverImageUrl = savedPage.imageUrl;
      savedStory = await this.storyRepository.save(story);
    }

    return {
      story: savedStory,
      page: savedPage,
      models: media.models,
    };
  }

  async finishStory(input: { userId: string; storyId: string; title: string }) {
    const story = await this.storyRepository.findOne({
      where: { id: input.storyId, userId: input.userId },
    });

    if (!story) {
      throw new Error('Story not found');
    }

    story.title = input.title.trim();
    story.status = 'completed';
    story.titleOptions = null;

    return await this.storyRepository.save(story);
  }

  private async finishStream(input: {
    story: Story;
    page: StoryPage;
    userId: string;
    seed: StorySeed;
    models: { text: string; image: string; audio: string };
  }): Promise<StoryCompleteEvent> {
    const maxPages = this.storyAiService.getMaxPages();
    if (input.page.pageNumber >= maxPages) {
      const titleOptions = await this.storyAiService.generateTitleOptions(
        input.userId,
        input.seed,
        input.story.theme,
      );
      input.story.status = 'awaiting_title';
      input.story.titleOptions = titleOptions.titles;
      input.story.seed = input.seed;
      await this.storyRepository.save(input.story);

      return {
        type: 'complete',
        page: input.page,
        story: input.story,
        isEnd: true,
        titleOptions: titleOptions.titles,
        models: input.models,
      };
    }

    return {
      type: 'complete',
      page: input.page,
      story: input.story,
      isEnd: false,
      titleOptions: [],
      models: input.models,
    };
  }
}
