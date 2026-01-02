import { Injectable } from '@nestjs/common';

@Injectable()
export class OpenAiService {
  async request(input: {
    apiKey: string;
    baseUrl?: string | null;
    model: string;
    systemPrompt: string;
    prompt: string;
  }): Promise<{
    content: string;
    usage: {
      inputTokens: number | null;
      outputTokens: number | null;
      totalTokens: number | null;
      cost: string | null;
      metadata: Record<string, unknown> | null;
    };
  }> {
    const baseUrl = input.baseUrl ?? 'https://api.openai.com/v1';
    const response = await fetch(
      `${baseUrl.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: input.model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: input.systemPrompt },
            { role: 'user', content: input.prompt },
          ],
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI API error: ${body}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    return {
      content: data.choices?.[0]?.message?.content ?? '{}',
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? null,
        outputTokens: data.usage?.completion_tokens ?? null,
        totalTokens: data.usage?.total_tokens ?? null,
        cost: null,
        metadata: null,
      },
    };
  }
}
