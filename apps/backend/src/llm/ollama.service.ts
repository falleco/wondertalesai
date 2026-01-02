import { Injectable } from '@nestjs/common';

@Injectable()
export class OllamaService {
  async request(input: {
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
    const baseUrl = input.baseUrl ?? 'http://localhost:11434';
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: input.model,
        stream: false,
        format: 'json',
        messages: [
          { role: 'system', content: input.systemPrompt },
          { role: 'user', content: input.prompt },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama API error: ${body}`);
    }

    const data = (await response.json()) as {
      message?: { content?: string };
      prompt_eval_count?: number;
      eval_count?: number;
      total_duration?: number;
    };

    return {
      content: data.message?.content ?? '{}',
      usage: {
        inputTokens: data.prompt_eval_count ?? null,
        outputTokens: data.eval_count ?? null,
        totalTokens:
          data.prompt_eval_count && data.eval_count
            ? data.prompt_eval_count + data.eval_count
            : null,
        cost: null,
        metadata: {
          totalDuration: data.total_duration ?? null,
        },
      },
    };
  }
}
