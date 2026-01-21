export type AiContext = {
  userId: string;
  feature: 'story' | (string & {});
  tier?: 'free' | 'paid';
};

export type AiModels = {
  text: string;
  image: string;
  audio: string;
};

export type AiTextRequest = {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
};

export type AiTextResponse = {
  text: string;
  model: string;
  raw?: unknown;
};

export type AiTextStreamRequest = AiTextRequest;
export type AiTextStreamResponse = AsyncGenerator<string>;

export type AiImageRequest = {
  prompt: string;
  model?: string;
  size?: '1024x1024' | '1024x1536' | '1536x1024' | 'auto';
};

export type AiImageResponse = {
  imageUrl: string | null;
  model: string;
};

export type AiAudioRequest = {
  text: string;
  model?: string;
  voice?: string;
};

export type AiAudioResponse = {
  audioUrl: string | null;
  model: string;
};

export interface AiProvider {
  id: string;
  getModels(): AiModels;
  generateText(
    request: AiTextRequest,
    context: AiContext,
  ): Promise<AiTextResponse>;
  streamText?(
    request: AiTextStreamRequest,
    context: AiContext,
  ): AiTextStreamResponse;
  generateImage(
    request: AiImageRequest,
    context: AiContext,
  ): Promise<AiImageResponse>;
  generateAudio(
    request: AiAudioRequest,
    context: AiContext,
  ): Promise<AiAudioResponse>;
}
