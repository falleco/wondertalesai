import { createOpenAI } from '@ai-sdk/openai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from '@server/ai/ai.service';
import type { AiContext, AiModels } from '@server/ai/ai-provider.interface';
import type { AppConfigurationType } from '@server/config/configuration';
import { streamText } from 'ai';
import OpenAI from 'openai';
import type { StorySeed } from './story.entity';
import type { StoryChoice } from './story-page.entity';

type StoryPageDraft = {
  text: string;
  imagePrompt: string;
  audioPrompt: string;
  imageUrl: string | null;
  audioUrl: string | null;
  choices: StoryChoice[];
  models: {
    text: string;
    image: string;
    audio: string;
  };
};

type StoryPageMedia = {
  imageUrl: string | null;
  audioUrl: string | null;
  choices: StoryChoice[];
  models: {
    image: string;
    audio: string;
  };
};

type StoryPageMetadata = {
  imagePrompt: string;
  audioPrompt: string;
  choices: StoryChoice[];
};

type StoryTitleOptions = {
  titles: [string, string];
  models: {
    text: string;
  };
};

const THEMES = [
  'floresta encantada',
  'castelo nas nuvens',
  'ilha de doces',
  'cidade das estrelas',
  'jardim dos ventos',
  'montanha da lua',
  'vale do arco-iris',
];

const HEROES = [
  'uma princesa curiosa',
  'um dragaozinho gentil',
  'uma raposa esperta',
  'um urso bailarino',
  'uma coruja sabia',
  'um coelho valente',
  'uma fadinha sonhadora',
];

const COMPANIONS = [
  'um vagalume que brilha forte',
  'um esquilo que guarda segredos',
  'um peixinho que canta baixinho',
  'um gato que adora enigmas',
  'um passarinho que desenha no ar',
  'um cervo de passos silenciosos',
];

const LOCATIONS = [
  'um bosque cheio de luzes',
  'um lago que reflete sonhos',
  'uma ponte de estrelas',
  'um moinho que gira o tempo',
  'uma torre de livros',
  'uma praca de risadas',
];

const MAGIC_ITEMS = [
  'chave de arco-iris',
  'capa de brisa',
  'mapa que canta',
  'varinha de caramelo',
  'tambor de trovão suave',
  'lanterna de vaga-lumes',
];

const MOODS = [
  'doce',
  'acolhedor',
  'brilhante',
  'misterioso',
  'cheio de risadinhas',
];

const CHOICE_ACTIONS = [
  'seguir uma trilha de folhas douradas',
  'conversar com um gigante gentil',
  'entrar em um portal de borboletas',
  'proteger um ninho magico',
  'ajudar a organizar um baile na praca',
  'procurar uma melodia escondida',
];

const CHOICE_REWARDS = [
  'ganhar uma estrela que ri',
  'descobrir uma nova amiga',
  'encontrar um segredo brilhante',
  'receber um abraco quentinho',
  'ouvir uma cancao especial',
  'achar um caminho iluminado',
];

const PAGE_OPENERS = [
  'Era uma vez, em um lugar onde os sonhos passeiam,',
  'Num fim de tarde macio como algodao,',
  'Quando o vento assobiou uma cancao feliz,',
  'No comeco de uma noite estrelada,',
  'Enquanto as nuvens brincavam de se esconder,',
];

const PAGE_TURNS = [
  'De repente, algo curioso apareceu no caminho.',
  'Foi entao que uma luz magica riscou o ceu.',
  'Logo depois, um convite inesperado chegou.',
  'Nesse instante, um som suave chamou a atencao.',
  'Sem perceber, a aventura ficou ainda maior.',
];

const STORY_MAX_PAGES = 6;

@Injectable()
export class StoryAiService {
  private logger = new Logger(StoryAiService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
  ) {}

  pickTheme() {
    return this.pick(THEMES);
  }

  createSeed(_theme: string): StorySeed {
    return {
      hero: this.pick(HEROES),
      companion: this.pick(COMPANIONS),
      location: this.pick(LOCATIONS),
      magicItem: this.pick(MAGIC_ITEMS),
      mood: this.pick(MOODS),
    };
  }

  async generatePage(input: {
    userId: string;
    seed: StorySeed;
    theme: string;
    pageNumber: number;
    choiceText?: string | null;
  }): Promise<StoryPageDraft> {
    const context = this.buildContext(input.userId);
    const models = this.resolveModels(context);

    try {
      const textResult = await this.aiService.generateText(
        {
          systemPrompt: this.getStorySystemPrompt(),
          userPrompt: this.getStoryUserPrompt(input),
          temperature: 0.85,
        },
        context,
      );

      const parsed = this.parseStoryPayload(textResult.text, input.pageNumber);

      return {
        text: parsed.text,
        imagePrompt: parsed.imagePrompt,
        audioPrompt: parsed.audioPrompt,
        imageUrl: null,
        audioUrl: null,
        choices: parsed.choices,
        models,
      };
    } catch (error) {
      this.logger.warn(`Fallback story generation used. ${error}`);
      return this.generateFallbackPage(input, models);
    }
  }

  getModelsForUser(userId: string): AiModels {
    const context = this.buildContext(userId);
    return this.resolveModels(context);
  }

  async *streamStoryText(input: {
    userId: string;
    seed: StorySeed;
    theme: string;
    pageNumber: number;
    choiceText?: string | null;
    abortSignal?: AbortSignal;
  }): AsyncGenerator<string> {
    try {
      const config = this.getOpenAiConfig();
      const openai = createOpenAI({
        apiKey: config.openAiKey,
        baseURL: config.openAiBaseUrl,
      });
      const result = await streamText({
        model: openai(config.openAiTextModel),
        system: this.getStoryTextSystemPrompt(),
        prompt: this.getStoryUserPrompt(input),
        temperature: 0.85,
        maxOutputTokens: 900,
        timeout: config.openAiTimeoutMs,
        abortSignal: input.abortSignal,
      });

      for await (const chunk of result.textStream) {
        if (input.abortSignal?.aborted) {
          return;
        }
        if (chunk) {
          yield chunk;
        }
      }
    } catch (error) {
      if (input.abortSignal?.aborted) {
        return;
      }
      this.logger.warn(`Streaming story fallback used. ${error}`);
      yield this.generateFallbackText(input);
    }
  }

  async *streamAudioChunks(input: {
    userId: string;
    text: string;
    abortSignal?: AbortSignal;
  }): AsyncGenerator<{ format: string; data: string }> {
    const context = this.buildContext(input.userId);
    const config = this.getOpenAiConfig();

    try {
      const client = this.createOpenAiClient(config);
      const response = await client.audio.speech.create(
        {
          model: config.openAiAudioModel,
          voice: config.openAiAudioVoice,
          input: input.text,
          response_format: 'opus',
          stream_format: 'audio',
        },
        {
          timeout: config.openAiTimeoutMs,
          signal: input.abortSignal,
        },
      );

      const body = response.body;
      if (!body) {
        throw new Error('Audio stream unavailable');
      }

      const reader = body.getReader();
      while (true) {
        if (input.abortSignal?.aborted) return;
        const { value, done } = await reader.read();
        if (done) break;
        if (value?.byteLength) {
          yield {
            format: 'opus',
            data: Buffer.from(value).toString('base64'),
          };
        }
      }
      return;
    } catch (error) {
      if (input.abortSignal?.aborted) return;
      this.logger.warn(`Streaming audio fallback used. ${error}`);
    }

    yield* this.fallbackAudioChunks(input.text, context, input.abortSignal);
  }

  async generatePageMetadata(input: {
    userId: string;
    seed: StorySeed;
    theme: string;
    pageNumber: number;
    storyText: string;
    choiceText?: string | null;
  }): Promise<StoryPageMetadata> {
    const context = this.buildContext(input.userId);

    try {
      const result = await this.aiService.generateText(
        {
          systemPrompt: this.getStoryMetadataSystemPrompt(),
          userPrompt: this.getStoryMetadataUserPrompt(input),
          temperature: 0.6,
        },
        context,
      );

      return this.parseStoryMetadataPayload(
        result.text,
        input.pageNumber,
        input.storyText,
      );
    } catch (error) {
      this.logger.warn(`Fallback metadata used. ${error}`);
      return this.generateFallbackMetadata(input);
    }
  }

  async generateMedia(input: {
    userId: string;
    theme: string;
    pageNumber: number;
    text: string;
    imagePrompt: string;
    audioPrompt: string;
    imageUrl: string | null;
    audioUrl: string | null;
    choices: StoryChoice[];
  }): Promise<StoryPageMedia> {
    const context = this.buildContext(input.userId);
    const models = this.resolveModels(context);

    const imagePromise = input.imageUrl
      ? Promise.resolve({ imageUrl: input.imageUrl, model: models.image })
      : this.safeImage(
          context,
          input.imagePrompt,
          `${input.theme} - pagina ${input.pageNumber}`,
          models.image,
        );

    const audioPromise = input.audioUrl
      ? Promise.resolve({ audioUrl: input.audioUrl, model: models.audio })
      : this.safeAudio(context, input.text, input.audioPrompt, models.audio);

    const choicePromises = input.choices.map((choice, index) =>
      choice.imageUrl
        ? Promise.resolve({ imageUrl: choice.imageUrl, model: models.image })
        : this.safeChoiceImage(
            context,
            choice.imagePrompt,
            `Escolha ${index + 1}`,
            models.image,
          ),
    );

    const [imageResult, audioResult, ...choiceImages] = await Promise.all([
      imagePromise,
      audioPromise,
      ...choicePromises,
    ]);

    const choices = input.choices.map((choice, index) => ({
      ...choice,
      imageUrl: choiceImages[index]?.imageUrl ?? null,
    }));

    return {
      imageUrl: imageResult.imageUrl,
      audioUrl: audioResult.audioUrl,
      choices,
      models: {
        image: models.image,
        audio: models.audio,
      },
    };
  }

  async generateTitleOptions(
    userId: string,
    seed: StorySeed,
    theme: string,
  ): Promise<StoryTitleOptions> {
    const context = this.buildContext(userId);
    const models = this.resolveModels(context);

    try {
      const result = await this.aiService.generateText(
        {
          systemPrompt:
            'Crie dois titulos de livro infantil. Responda apenas JSON com { "titles": ["", ""] }.',
          userPrompt: `Tema: ${theme}. Heroi: ${seed.hero}. Lugar: ${seed.location}. Item magico: ${seed.magicItem}.`,
          temperature: 0.6,
        },
        context,
      );
      const parsed = this.safeParse(result.text) as { titles?: string[] };
      const titles = parsed?.titles?.filter(Boolean) ?? [];
      if (titles.length >= 2) {
        return {
          titles: [String(titles[0]), String(titles[1])],
          models: { text: models.text },
        };
      }
    } catch (error) {
      this.logger.warn(`Fallback titles used. ${error}`);
    }

    return this.generateFallbackTitleOptions(seed, theme, models);
  }

  getMaxPages() {
    return STORY_MAX_PAGES;
  }

  private buildChoices(seed: StorySeed, pageNumber: number): StoryChoice[] {
    const action = this.pick(CHOICE_ACTIONS);
    const reward = this.pick(CHOICE_REWARDS);
    const optionA = `Tentar ${action}.`;
    const optionB = `Voltar e ${reward}.`;

    return [
      {
        id: `A-${pageNumber}`,
        text: optionA,
        imagePrompt: `Ilustracao de conto de fadas de ${optionA}, ${seed.hero}, ${seed.location}, luz suave.`,
        imageUrl: null,
      },
      {
        id: `B-${pageNumber}`,
        text: optionB,
        imagePrompt: `Ilustracao de conto de fadas de ${optionB}, ${seed.hero}, ${seed.location}, luz suave.`,
        imageUrl: null,
      },
    ];
  }

  private placeholderImage(label: string) {
    const safeLabel = encodeURIComponent(label);
    return `https://placehold.co/640x420/png?text=${safeLabel}`;
  }

  private getStorySystemPrompt() {
    return [
      'Voce e um contador de historias infantis em portugues brasileiro.',
      'Escreva em tom de conto de fadas classico, com frases curtas e gentis.',
      'Responda SOMENTE JSON com as chaves: text, imagePrompt, choices.',
      'choices deve ter 2 itens com { text, imagePrompt }.',
      'choices.text deve ter no maximo 8 palavras.',
      'text deve ter de 3 a 5 frases.',
    ].join(' ');
  }

  private getStoryTextSystemPrompt() {
    return [
      'Voce e um contador de historias infantis em portugues brasileiro.',
      'Escreva em tom de conto de fadas classico, com frases curtas e gentis.',
      'Responda SOMENTE com o texto da historia.',
      'Nao use marcadores ou numeracao.',
      'O texto deve ter de 3 a 5 frases.',
    ].join(' ');
  }

  private getStoryMetadataSystemPrompt() {
    return [
      'Voce cria metadados para uma pagina de livro infantil.',
      'Responda SOMENTE JSON com as chaves: imagePrompt, choices.',
      'choices deve ter 2 itens com { text, imagePrompt }.',
      'choices.text deve ter no maximo 8 palavras.',
      'imagePrompt deve descrever uma ilustracao infantil da pagina.',
    ].join(' ');
  }

  private getStoryUserPrompt(input: {
    seed: StorySeed;
    theme: string;
    pageNumber: number;
    choiceText?: string | null;
  }) {
    const choiceLine = input.choiceText
      ? `A crianca escolheu: ${input.choiceText}.`
      : 'A aventura esta comecando.';
    return [
      `Tema: ${input.theme}.`,
      `Heroi: ${input.seed.hero}.`,
      `Companheiro: ${input.seed.companion}.`,
      `Lugar: ${input.seed.location}.`,
      `Item magico: ${input.seed.magicItem}.`,
      `Clima: ${input.seed.mood}.`,
      `Pagina: ${input.pageNumber}.`,
      choiceLine,
    ].join(' ');
  }

  private getStoryMetadataUserPrompt(input: {
    seed: StorySeed;
    theme: string;
    pageNumber: number;
    storyText: string;
    choiceText?: string | null;
  }) {
    const choiceLine = input.choiceText
      ? `A crianca escolheu: ${input.choiceText}.`
      : 'A aventura esta comecando.';
    return [
      `Tema: ${input.theme}.`,
      `Heroi: ${input.seed.hero}.`,
      `Companheiro: ${input.seed.companion}.`,
      `Lugar: ${input.seed.location}.`,
      `Item magico: ${input.seed.magicItem}.`,
      `Clima: ${input.seed.mood}.`,
      `Pagina: ${input.pageNumber}.`,
      choiceLine,
      `Texto: ${input.storyText}`,
    ].join(' ');
  }

  private parseStoryPayload(payload: string, pageNumber: number) {
    const parsed = this.safeParse(payload) as {
      text?: string;
      imagePrompt?: string;
      audioPrompt?: string;
      choices?: Array<{ text?: string; imagePrompt?: string }>;
    };
    if (!parsed?.text || !parsed?.choices?.length) {
      throw new Error('Invalid story payload');
    }

    const choices = parsed.choices.slice(0, 2).map((choice, index) => {
      const text = String(choice.text ?? '').trim();
      return {
        id: `${index === 0 ? 'A' : 'B'}-${pageNumber}`,
        text: text || 'Seguir o caminho magico.',
        imagePrompt:
          choice.imagePrompt ??
          `Ilustracao de conto de fadas: ${text || 'aventura'}.`,
        imageUrl: null,
      };
    });

    const text = String(parsed.text ?? '').trim();
    return {
      text,
      imagePrompt: String(
        parsed.imagePrompt ?? `Ilustracao de conto de fadas: ${text}`,
      ).trim(),
      audioPrompt: text,
      choices,
    };
  }

  private parseStoryMetadataPayload(
    payload: string,
    pageNumber: number,
    storyText: string,
  ): StoryPageMetadata {
    const parsed = this.safeParse(payload) as {
      imagePrompt?: string;
      choices?: Array<{ text?: string; imagePrompt?: string }>;
    };
    if (!parsed?.choices?.length) {
      throw new Error('Invalid metadata payload');
    }

    const choices = parsed.choices.slice(0, 2).map((choice, index) => {
      const text = String(choice.text ?? '').trim();
      return {
        id: `${index === 0 ? 'A' : 'B'}-${pageNumber}`,
        text: text || 'Seguir o caminho magico.',
        imagePrompt:
          choice.imagePrompt ??
          `Ilustracao de conto de fadas: ${text || 'aventura'}.`,
        imageUrl: null,
      };
    });

    return {
      imagePrompt:
        String(
          parsed.imagePrompt ?? `Ilustracao de conto de fadas: ${storyText}`,
        ).trim() || `Ilustracao de conto de fadas: ${storyText}`,
      audioPrompt: storyText,
      choices,
    };
  }

  private async safeImage(
    context: AiContext,
    prompt: string,
    placeholderLabel: string,
    imageModel: string,
  ) {
    if (!prompt?.trim()) {
      return {
        imageUrl: this.placeholderImage(placeholderLabel),
        model: imageModel,
      };
    }
    try {
      return await this.aiService.generateImage({ prompt }, context);
    } catch (error) {
      this.logger.warn(`Image generation failed: ${error}`);
      return {
        imageUrl: this.placeholderImage(placeholderLabel),
        model: imageModel,
      };
    }
  }

  private async safeChoiceImage(
    context: AiContext,
    prompt: string,
    placeholderLabel: string,
    imageModel: string,
  ) {
    if (!prompt?.trim()) {
      return {
        imageUrl: this.placeholderImage(placeholderLabel),
        model: imageModel,
      };
    }
    try {
      return await this.aiService.generateImage({ prompt }, context);
    } catch (error) {
      this.logger.warn(`Choice image failed: ${error}`);
      return {
        imageUrl: this.placeholderImage(placeholderLabel),
        model: imageModel,
      };
    }
  }

  private async safeAudio(
    context: AiContext,
    text: string,
    prompt: string,
    audioModel: string,
  ) {
    const narrationText = text?.trim() ? text : prompt;
    if (!narrationText?.trim()) {
      return {
        audioUrl: null,
        model: audioModel,
      };
    }
    try {
      return await this.aiService.generateAudio(
        { text: narrationText },
        context,
      );
    } catch (error) {
      this.logger.warn(`Audio generation failed: ${error}`);
      return {
        audioUrl: null,
        model: audioModel,
      };
    }
  }

  private buildContext(userId: string): AiContext {
    return {
      userId,
      feature: 'story',
    };
  }

  private resolveModels(context: AiContext): AiModels {
    try {
      const models = this.aiService.getModels(context);
      const config = this.configService.get<AppConfigurationType['ai']>('ai');
      if (config?.openAiTextModel) {
        return { ...models, text: config.openAiTextModel };
      }
      return models;
    } catch (error) {
      this.logger.warn(`AI models unavailable, using defaults. ${error}`);
      return {
        text: 'gpt-4o-mini',
        image: 'gpt-image-1',
        audio: 'gpt-4o-mini-tts',
      };
    }
  }

  private getOpenAiConfig() {
    const config = this.configService.get<AppConfigurationType['ai']>('ai');
    if (!config?.openAiKey) {
      throw new Error('LLM_OPEN_AI_KEY is not configured');
    }

    return {
      openAiKey: config.openAiKey,
      openAiBaseUrl: config.openAiBaseUrl ?? 'https://api.openai.com/v1',
      openAiTextModel: config.openAiTextModel ?? 'gpt-4o-mini',
      openAiAudioModel: config.openAiAudioModel ?? 'gpt-4o-mini-tts',
      openAiAudioVoice: config.openAiAudioVoice ?? 'alloy',
      openAiTimeoutMs: config.openAiTimeoutMs ?? 20000,
    };
  }

  private createOpenAiClient(
    config: ReturnType<StoryAiService['getOpenAiConfig']>,
  ) {
    return new OpenAI({
      apiKey: config.openAiKey,
      baseURL: config.openAiBaseUrl,
      timeout: config.openAiTimeoutMs,
    });
  }

  private async *fallbackAudioChunks(
    text: string,
    context: AiContext,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<{ format: string; data: string }> {
    if (!text.trim()) return;
    try {
      const audio = await this.aiService.generateAudio({ text }, context);
      if (!audio.audioUrl?.startsWith('data:')) return;
      const match = audio.audioUrl.match(
        /^data:audio\/([a-zA-Z0-9+.-]+);base64,(.+)$/,
      );
      if (!match) return;
      const format = match[1] === 'mpeg' ? 'mp3' : match[1];
      const buffer = Buffer.from(match[2], 'base64');
      const chunkSize = 16000;
      for (let offset = 0; offset < buffer.length; offset += chunkSize) {
        if (abortSignal?.aborted) return;
        const chunk = buffer.subarray(offset, offset + chunkSize);
        yield { format, data: chunk.toString('base64') };
      }
    } catch (error) {
      this.logger.warn(`Audio fallback failed. ${error}`);
    }
  }

  private safeParse(payload: string) {
    try {
      return JSON.parse(payload);
    } catch (error) {
      this.logger.warn(`Failed to parse AI JSON: ${error}`);
      throw error;
    }
  }

  private generateFallbackPage(
    input: {
      seed: StorySeed;
      theme: string;
      pageNumber: number;
      choiceText?: string | null;
    },
    models: AiModels,
  ): StoryPageDraft {
    const opener = this.pick(PAGE_OPENERS);
    const turn = this.pick(PAGE_TURNS);
    const { hero, companion, location, magicItem, mood } = input.seed;
    const choiceLine = input.choiceText
      ? `A escolha foi: ${input.choiceText}.`
      : 'A aventura estava so comecando.';

    const text = [
      `${opener} havia ${hero} no ${input.theme}.`,
      `Ela caminhava com ${companion} rumo a ${location}.`,
      `${choiceLine} O ar parecia ${mood}, e o ${magicItem} brilhava.`,
      `${turn} A historia pedia coragem e gentileza.`,
    ].join(' ');

    const imagePrompt = `Classic fairy tale illustration, ${input.theme}, ${hero} with ${companion}, ${location}, ${magicItem}, soft watercolor, warm light, kid friendly, storybook style.`;
    const audioPrompt = text;

    const choices = this.buildChoices(input.seed, input.pageNumber);

    return {
      text,
      imagePrompt,
      audioPrompt,
      imageUrl: null,
      audioUrl: null,
      choices,
      models,
    };
  }

  private generateFallbackText(input: {
    seed: StorySeed;
    theme: string;
    pageNumber: number;
    choiceText?: string | null;
  }) {
    const opener = this.pick(PAGE_OPENERS);
    const turn = this.pick(PAGE_TURNS);
    const { hero, companion, location, magicItem, mood } = input.seed;
    const choiceLine = input.choiceText
      ? `A escolha foi: ${input.choiceText}.`
      : 'A aventura estava so comecando.';

    return [
      `${opener} havia ${hero} no ${input.theme}.`,
      `Ela caminhava com ${companion} rumo a ${location}.`,
      `${choiceLine} O ar parecia ${mood}, e o ${magicItem} brilhava.`,
      `${turn} A historia pedia coragem e gentileza.`,
    ].join(' ');
  }

  private generateFallbackMetadata(input: {
    seed: StorySeed;
    theme: string;
    pageNumber: number;
    storyText: string;
  }): StoryPageMetadata {
    return {
      imagePrompt: `Classic fairy tale illustration, ${input.theme}, ${input.seed.hero} with ${input.seed.companion}, ${input.seed.location}, ${input.seed.magicItem}, soft watercolor, warm light, kid friendly, storybook style.`,
      audioPrompt: input.storyText,
      choices: this.buildChoices(input.seed, input.pageNumber),
    };
  }

  private generateFallbackTitleOptions(
    seed: StorySeed,
    theme: string,
    models: AiModels,
  ): StoryTitleOptions {
    const base = `${seed.hero} no ${theme}`;
    const titleA = `${base} e a ${seed.magicItem}`;
    const titleB = `O segredo de ${seed.location}`;
    return {
      titles: [titleA, titleB],
      models: { text: models.text },
    };
  }

  private pick<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }
}
