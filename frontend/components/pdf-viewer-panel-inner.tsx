"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Minus, Plus, Maximize2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { documentFileUrl } from "@/lib/api/documents";

if (typeof window !== "undefined" && pdfjs) {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;

export type PdfTarget = {
  documentId: string;
  documentName: string;
  page: number;
  customFileUrl?: string;
};

export function PdfViewerPanelInner({
  target,
  onClose,
}: {
  target: PdfTarget | null;
  onClose: () => void;
}) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(640);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const isJumpingRef = useRef(false);

  // Jump to the cited page and reset zoom when a new citation is opened.
  useEffect(() => {
    if (!target) return;
    setPageNumber(target.page);
    setPageInput(String(target.page));
    setError(null);
    setZoom(1);
    setNumPages(0);
  }, [target]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(Math.max(280, Math.floor(w - 32)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  const scrollToPage = useCallback((page: number) => {
    const el = pageRefs.current.get(page);
    if (!el) return;
    isJumpingRef.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      isJumpingRef.current = false;
    }, 400);
  }, []);

  // After pages mount (or citation changes), scroll to the target page.
  useEffect(() => {
    if (!target || !numPages) return;
    const page = Math.min(Math.max(1, target.page), numPages);
    // Wait a frame so page nodes exist in the map.
    const id = window.requestAnimationFrame(() => scrollToPage(page));
    return () => window.cancelAnimationFrame(id);
  }, [target, numPages, scrollToPage]);

  // Track which page is currently in view while scrolling.
  useEffect(() => {
    const root = containerRef.current;
    if (!root || !numPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isJumpingRef.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (!top) return;
        const page = Number((top.target as HTMLElement).dataset.page);
        if (!Number.isFinite(page)) return;
        setPageNumber(page);
        setPageInput(String(page));
      },
      { root, threshold: [0.35, 0.55, 0.75] },
    );

    pageRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [numPages, zoom, containerWidth]);

  const file = useMemo(
    () =>
      target
        ? {
            url: target.customFileUrl ?? documentFileUrl(target.documentId),
            withCredentials: !target.customFileUrl,
          }
        : null,
    [target],
  );

  const pageWidth = Math.floor(containerWidth * zoom);

  const zoomIn = useCallback(
    () =>
      setZoom((z) =>
        Math.min(MAX_ZOOM, Math.round((z + ZOOM_STEP) * 100) / 100),
      ),
    [],
  );
  const zoomOut = useCallback(
    () =>
      setZoom((z) =>
        Math.max(MIN_ZOOM, Math.round((z - ZOOM_STEP) * 100) / 100),
      ),
    [],
  );
  const fitWidth = useCallback(() => setZoom(1), []);

  const commitPageInput = useCallback(() => {
    if (!numPages) return;
    const parsed = Number.parseInt(pageInput, 10);
    if (!Number.isFinite(parsed)) {
      setPageInput(String(pageNumber));
      return;
    }
    const next = Math.min(Math.max(1, parsed), numPages);
    setPageNumber(next);
    setPageInput(String(next));
    scrollToPage(next);
  }, [numPages, pageInput, pageNumber, scrollToPage]);

  // Ctrl/Cmd + scroll wheel to zoom while hovering the page area.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !target) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      if (event.deltaY < 0) zoomIn();
      else zoomOut();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [target, zoomIn, zoomOut]);

  return (
    <Sheet
      open={!!target}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex h-full !w-1/2 !max-w-none flex-col gap-0 p-0 data-[side=right]:!w-1/2 data-[side=right]:sm:!max-w-none"
      >
        <SheetHeader className="shrink-0 space-y-3 border-b p-4">
          <SheetTitle className="truncate pr-8">
            {target?.documentName ?? "Document"}
          </SheetTitle>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Page</span>
              <Input
                type="number"
                min={1}
                max={numPages || undefined}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={commitPageInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitPageInput();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="h-8 w-16 px-2 text-center text-xs tabular-nums"
                aria-label="Go to page"
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                / {numPages || "—"}
              </span>
            </div>

            <div className="mx-1 h-4 w-px bg-border" />

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={zoomOut}
                disabled={zoom <= MIN_ZOOM}
                aria-label="Zoom out"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="min-w-12 text-center text-xs text-muted-foreground tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={zoomIn}
                disabled={zoom >= MAX_ZOOM}
                aria-label="Zoom in"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={fitWidth}
                aria-label="Fit to width"
                title="Fit to width"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div
          ref={containerRef}
          className="min-h-0 flex-1 overflow-auto bg-muted/40"
        >
          {error ? (
            <div className="m-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              {error}
            </div>
          ) : file ? (
            <div className="flex min-h-full justify-center p-4">
              <Document
                file={file}
                onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                onLoadError={(e) =>
                  setError(e?.message ?? "Failed to load the PDF")
                }
                loading={
                  <div className="flex items-center justify-center py-24">
                    <Spinner className="size-6 text-muted-foreground" />
                  </div>
                }
              >
                <div className="flex flex-col items-center gap-4">
                  {Array.from({ length: numPages }, (_, i) => i + 1).map(
                    (page) => (
                      <div
                        key={page}
                        data-page={page}
                        ref={(el) => {
                          if (el) pageRefs.current.set(page, el);
                          else pageRefs.current.delete(page);
                        }}
                        className="scroll-mt-2"
                      >
                        <Page
                          pageNumber={page}
                          width={pageWidth}
                          renderAnnotationLayer
                          renderTextLayer
                          className="overflow-hidden rounded-md bg-white shadow-md"
                        />
                      </div>
                    ),
                  )}
                </div>
              </Document>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
