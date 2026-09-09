import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';

export type PdfPage = {
  pageNumber: number;
  text: string;
};

export type PdfExtraction = {
  pages: PdfPage[];
  pageCount: number;
};

/**
 * Extracts text per page from a PDF using pdf-parse v2 (which wraps pdfjs).
 * Per-page extraction is essential so every chunk keeps an accurate page
 * number for citations.
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async extractPages(buffer: Buffer): Promise<PdfExtraction> {
    const mod = await this.loadPdfParse();
    const parser = new mod.PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText({
        // Disable the default "-- page x of y --" page joiner so it does not
        // leak into chunk text (and thus into citations).
        pageJoiner: '',
      });

      const pages: PdfPage[] = (result.pages ?? [])
        .map((page) => ({
          pageNumber: page.num,
          text: (page.text ?? '').trim(),
        }))
        .filter((page) => page.text.length > 0);

      return { pages, pageCount: result.total ?? pages.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to parse PDF → ${message}`);
      throw new UnprocessableEntityException(
        `Could not extract text from PDF: ${message}`,
      );
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  private async loadPdfParse() {
    try {
      return await import('pdf-parse');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load pdf-parse → ${message}`);
      throw new UnprocessableEntityException('PDF parser is unavailable');
    }
  }
}
