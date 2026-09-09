import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PdfPage } from './pdf.service';

export type Chunk = {
  pageNumber: number;
  text: string;
};

/**
 * Splits per-page text into overlapping chunks. Chunking is done independently
 * for each page and every chunk records its single source page number, so a
 * chunk can never silently span two pages — a citation always points to the
 * correct page.
 */
@Injectable()
export class ChunkingService {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(private readonly config: ConfigService) {
    this.chunkSize = this.config.get<number>('rag.chunkSize') ?? 1000;
    this.chunkOverlap = this.config.get<number>('rag.chunkOverlap') ?? 200;
  }

  chunkPages(pages: PdfPage[]): Chunk[] {
    const chunks: Chunk[] = [];
    for (const page of pages) {
      for (const text of this.chunkText(page.text)) {
        chunks.push({ pageNumber: page.pageNumber, text });
      }
    }
    return chunks;
  }

  private chunkText(raw: string): string[] {
    const text = raw.replace(/\s+/g, ' ').trim();
    if (!text) return [];
    if (text.length <= this.chunkSize) return [text];

    const step = Math.max(1, this.chunkSize - this.chunkOverlap);
    const chunks: string[] = [];

    for (let start = 0; start < text.length; start += step) {
      let end = Math.min(start + this.chunkSize, text.length);

      // Prefer to break on a word boundary when we are not at the very end.
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start) end = lastSpace;
      }

      const slice = text.slice(start, end).trim();
      if (slice) chunks.push(slice);

      if (end >= text.length) break;
    }

    return chunks;
  }
}
