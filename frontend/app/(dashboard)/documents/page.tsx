"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Upload, FileText, MoreHorizontal, Eye, Download, Trash2 } from "lucide-react";
import { fetchDocuments, type ApiDocument } from "@/lib/api/documents";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments()
      .then((items) => {
        setDocuments(items);
        setError(null);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load documents",
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-zinc-500 mt-2">Manage your organization&apos;s knowledge base.</p>
        </div>
        <Button className="flex items-center gap-2" disabled>
          <Upload className="w-4 h-4" />
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
          No documents uploaded yet. Upload a manual to start chatting with your knowledge base.
        </div>
      ) : (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-black">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                <TableHead className="py-4">Document Details</TableHead>
                <TableHead className="py-4">Type</TableHead>
                <TableHead className="py-4">Uploaded By</TableHead>
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
                        <div className="text-xs text-zinc-500 mt-0.5">{doc.filename}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-zinc-600 dark:text-zinc-400">{doc.docuemntType}</TableCell>
                  <TableCell className="py-4 text-zinc-600 dark:text-zinc-400">{doc.uploaded_by}</TableCell>
                  <TableCell className="py-4 text-zinc-500">{formatDate(doc.createdAt)}</TableCell>
                  <TableCell className="py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-muted dark:hover:text-zinc-100 outline-none"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
                          <Trash2 className="w-4 h-4" />
                          Delete
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
  );
}
