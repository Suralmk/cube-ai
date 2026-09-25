"use client";

import dynamic from "next/dynamic";
import type { PdfTarget } from "./pdf-viewer-panel-inner";

export type { PdfTarget };

const DynamicPdfViewerPanel = dynamic(
  () =>
    import("./pdf-viewer-panel-inner").then((mod) => mod.PdfViewerPanelInner),
  {
    ssr: false,
    loading: () => null,
  },
);

export function PdfViewerPanel(props: {
  target: PdfTarget | null;
  onClose: () => void;
}) {
  return <DynamicPdfViewerPanel {...props} />;
}
