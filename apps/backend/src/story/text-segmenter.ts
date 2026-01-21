import { randomUUID } from 'node:crypto';

export type TextSegment = {
  id: string;
  sequenceNumber: number;
  text: string;
};

export class StoryTextSegmenter {
  private buffer = '';
  private sequence = 0;
  private readonly minChars = 40;
  private readonly maxChars = 200;

  push(token: string): TextSegment[] {
    if (!token) return [];
    this.buffer += token;
    return this.extractSegments();
  }

  flush(): TextSegment[] {
    if (!this.buffer.trim()) {
      this.buffer = '';
      return [];
    }

    const text = this.buffer.trim();
    this.buffer = '';
    return [this.createSegment(text)];
  }

  private extractSegments(): TextSegment[] {
    const segments: TextSegment[] = [];

    while (this.buffer.length > 0) {
      const punctuationIndex = this.findPunctuationCut();
      if (punctuationIndex >= 0) {
        const text = this.buffer.slice(0, punctuationIndex + 1).trim();
        if (text) {
          segments.push(this.createSegment(text));
        }
        this.buffer = this.buffer.slice(punctuationIndex + 1).trimStart();
        continue;
      }

      if (this.buffer.length >= this.maxChars) {
        const cutIndex = this.findLengthCut();
        const text = this.buffer.slice(0, cutIndex).trim();
        if (text) {
          segments.push(this.createSegment(text));
        }
        this.buffer = this.buffer.slice(cutIndex).trimStart();
        continue;
      }

      break;
    }

    return segments;
  }

  private findPunctuationCut() {
    const indexes = [
      this.buffer.lastIndexOf('.'),
      this.buffer.lastIndexOf('!'),
      this.buffer.lastIndexOf('?'),
    ];
    const index = Math.max(...indexes);
    if (index < 0) return -1;
    if (index + 1 < this.minChars) return -1;
    return index;
  }

  private findLengthCut() {
    const maxIndex = Math.min(this.maxChars, this.buffer.length);
    const whitespaceIndex = this.buffer.lastIndexOf(' ', maxIndex);
    if (whitespaceIndex > this.minChars) {
      return whitespaceIndex;
    }
    return maxIndex;
  }

  private createSegment(text: string): TextSegment {
    this.sequence += 1;
    return {
      id: randomUUID(),
      sequenceNumber: this.sequence,
      text,
    };
  }
}
