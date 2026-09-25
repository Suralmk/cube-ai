"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import {
  Upload,
  FileText,
  MoreHorizontal,
  Eye,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchDocuments,
  uploadDocument,
  reindexDocument,
  documentFileUrl,
  type ApiDocument,
  type DocumentStatus,
} from "@/lib/api/documents";
import { PdfViewerPanel, type PdfTarget } from "@/components/pdf-viewer-panel";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

const STATUS_STYLES: Record<DocumentStatus, string> = {
  pending:
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  processing:
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  indexing:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  indexed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  ready:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: "Pending",
  processing: "Pending",
  indexing: "Indexing",
  indexed: "Indexed",
  ready: "Indexed",
  failed: "Failed",
};

function StatusBadge({ doc }: { doc: ApiDocument }) {
  const isBusy = doc.status === "indexing" || doc.status === "pending";
  return (
    <span
      title={doc.errorMessage ?? undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[doc.status]}`}
    >
      {isBusy && <Spinner className="size-3" />}
      {STATUS_LABELS[doc.status]}
    </span>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pdfTarget, setPdfTarget] = useState<PdfTarget | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const items = await fetchDocuments();
      setDocuments(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  // Poll while any document is still being processed so the UI reflects
  // indexing progress without a manual refresh.
  useEffect(() => {
    const hasPending = documents.some(
      (d) => d.status === "pending" || d.status === "indexing",
    );
    if (!hasPending) return;
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [documents, refresh]);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const doc = await uploadDocument(file);
      setDocuments((prev) => [doc, ...prev]);
      toast.success(`Uploaded ${doc.filename}. Indexing started.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReindex = async (doc: ApiDocument) => {
    try {
      await reindexDocument(doc.id);
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: "indexing" } : d)),
      );
      toast.success("Re-indexing started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Re-index failed");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0 w-full">
      <div className="p-8 max-w-6xl mx-auto w-full space-y-8 pb-16">
        <PdfViewerPanel target={pdfTarget} onClose={() => setPdfTarget(null)} />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
          e.target.value = "";
        }}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-zinc-500 mt-2">
            Manage your organization&apos;s knowledge base.
          </p>
        </div>
        <Button
          className="flex items-center gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Spinner className="size-4" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Upload Document
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-200">
          {error}
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center text-muted-foreground">
          No documents uploaded yet. Upload a manual to start chatting with your
          knowledge base.
        </div>
      ) : (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-black">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                <TableHead className="py-4">Document Details</TableHead>
                <TableHead className="py-4">Status</TableHead>
                <TableHead className="py-4">Type</TableHead>
                <TableHead className="py-4">Date</TableHead>
                <TableHead className="py-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{doc.title}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {doc.filename}
                          {doc.pageCount ? ` · ${doc.pageCount} pages` : ""}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <StatusBadge doc={doc} />
                  </TableCell>
                  <TableCell className="py-4 text-zinc-600 dark:text-zinc-400">
                    {doc.docuemntType}
                  </TableCell>
                  <TableCell className="py-4 text-zinc-500">
                    {formatDate(doc.createdAt)}
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-muted dark:hover:text-zinc-100 outline-none">
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          className="cursor-pointer flex items-center gap-2"
                          onClick={() =>
                            setPdfTarget({
                              documentId: doc.id,
                              documentName: doc.title,
                              page: 1,
                            })
                          }
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer flex items-center gap-2"
                          render={
                            <a
                              href={documentFileUrl(doc.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          }
                        >
                          <Download className="w-4 h-4" />
                          Open file
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer flex items-center gap-2"
                          onClick={() => void handleReindex(doc)}
                        >
                          <RefreshCw className="w-4 h-4" />
                          Re-index
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      </div>
    </div>
  );
}
