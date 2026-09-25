"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Send,
  FileText,
  Building2,
  Share2,
  Sun,
  Moon,
  ShieldCheck,
  BookOpen,
  Wrench,
  AlertTriangle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { useTheme } from "@teispace/next-themes";
import { toast } from "sonner";
import {
  fetchPublicOrganization,
  createPublicChatSession,
  fetchPublicSessionMessages,
  streamPublicChatMessage,
  publicDocumentFileUrl,
  type PublicOrganizationResponse,
} from "@/lib/api/public-chat";
import type { Citation } from "@/lib/api/chat";
import { ApiError } from "@/lib/api-client";
import { Markdown } from "@/components/markdown";
import { PdfViewerPanel, type PdfTarget } from "@/components/pdf-viewer-panel";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

function CitationSources({
  citations,
  onOpen,
}: {
  citations: Citation[];
  onOpen: (citation: Citation) => void;
}) {
  if (citations.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-1.5 border-t border-border/60 pt-3">
      <span className="text-xs font-medium text-muted-foreground">Sources</span>
      <div className="flex flex-wrap gap-2">
        {citations.map((citation) => (
          <button
            key={citation.id}
            type="button"
            onClick={() => onOpen(citation)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted"
          >
            <span className="flex h-4 min-w-4 items-center justify-center rounded bg-primary/10 px-1 text-[0.7em] font-semibold text-primary">
              {citation.marker}
            </span>
            <FileText className="h-3 w-3 text-muted-foreground" />
            <span className="max-w-[16rem] truncate">
              {citation.documentName}
            </span>
            <span className="text-muted-foreground">p.{citation.pageNumber}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatInputForm({
  input,
  setInput,
  onSubmit,
  disabled,
  placeholder,
  className = "",
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  return (
    <div className={className}>
      <form onSubmit={onSubmit} className="relative flex items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder || "Ask about maintenance, error codes, procedures..."}
          rows={1}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.shiftKey) return;
            e.preventDefault();
            if (!input.trim() || disabled) return;
            onSubmit(e as unknown as React.FormEvent);
          }}
          className="pr-12 min-h-12 max-h-32 resize-none overflow-y-auto rounded-3xl border-zinc-300 bg-background shadow-sm dark:border-zinc-700 focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-ring [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        />
        <Button
          type="submit"
          size="icon"
          className="absolute right-1.5 bottom-1.5 h-9 w-9 rounded-full"
          disabled={!input.trim() || disabled}
        >
          {disabled ? (
            <Spinner className="size-4" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground mt-2">
        Answers are strictly grounded in verified company maintenance documentation.
      </p>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex w-full">
      <div className="rounded-2xl bg-muted px-4 py-3 text-foreground">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.2s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.1s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70" />
        </div>
      </div>
    </div>
  );
}

function PublicChatContent() {
  const params = useParams();
  const slug =
    typeof params?.slug === "string"
      ? decodeURIComponent(params.slug)
      : Array.isArray(params?.slug)
        ? decodeURIComponent(params.slug[0])
        : "";

  const { theme, setTheme } = useTheme();
  const searchParams = useSearchParams();
  const urlSessionId = searchParams.get("session");

  const [orgData, setOrgData] = useState<PublicOrganizationResponse | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(urlSessionId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pdfTarget, setPdfTarget] = useState<PdfTarget | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeSessionRef = useRef<string | null>(urlSessionId);
  const hasMessages = messages.length > 0;

  // Fetch organization public profile
  useEffect(() => {
    let cancelled = false;
    setOrgLoading(true);
    setOrgError(null);

    fetchPublicOrganization(slug)
      .then((data) => {
        if (cancelled) return;
        setOrgData(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setOrgError(
          err instanceof ApiError
            ? err.message
            : "Could not load company information.",
        );
      })
      .finally(() => {
        if (!cancelled) setOrgLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Load session messages if session exists in URL
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setIsLoadingHistory(true);

    fetchPublicSessionMessages(slug, sessionId)
      .then(({ messages: apiMessages }) => {
        if (cancelled) return;
        setMessages(
          apiMessages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            citations: m.citations ?? [],
          })),
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setMessages([]);
        toast.error(
          err instanceof ApiError ? err.message : "Failed to load chat history",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, sessionId]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isSending]);

  const handleSend = useCallback(
    async (e: React.FormEvent, directMessage?: string) => {
      e.preventDefault();
      const content = (directMessage ?? input).trim();
      if (!content || isSending) return;

      setIsSending(true);
      if (!directMessage) setInput("");

      const tempUserId = `temp-user-${Date.now()}`;
      const assistantId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: tempUserId, role: "user", content },
        { id: assistantId, role: "assistant", content: "" },
      ]);

      let receivedDelta = false;
      try {
        let activeSession = activeSessionRef.current;

        if (!activeSession) {
          const newSession = await createPublicChatSession(
            slug,
            content.slice(0, 80) || "Public Maintenance Chat",
          );
          activeSession = newSession.id;
          activeSessionRef.current = newSession.id;
          setSessionId(newSession.id);
          window.history.replaceState(null, "", `/share/${slug}?session=${newSession.id}`);
        }

        await streamPublicChatMessage(slug, activeSession, content, {
          onUserMessage: (message) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempUserId
                  ? { id: message.id, role: "user", content: message.content }
                  : m,
              ),
            );
          },
          onDelta: (delta) => {
            receivedDelta = true;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + delta }
                  : m,
              ),
            );
          },
          onDone: (message) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      id: message.id,
                      role: "assistant",
                      content: message.content,
                      citations: message.citations ?? [],
                    }
                  : m,
              ),
            );
          },
        });
      } catch (error) {
        if (!receivedDelta) {
          setMessages((prev) =>
            prev.filter((m) => m.id !== tempUserId && m.id !== assistantId),
          );
          if (!directMessage) setInput(content);
        }
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Failed to send message. Please try again.",
        );
      } finally {
        setIsSending(false);
      }
    },
    [input, isSending, slug],
  );

  const openCitation = useCallback((citation: Citation) => {
    if (!citation.documentId) {
      toast.error("This source is no longer available");
      return;
    }
    setPdfTarget({
      documentId: citation.documentId,
      documentName: citation.documentName,
      page: citation.pageNumber,
      customFileUrl: publicDocumentFileUrl(citation.documentId),
    });
  }, []);

  const handleCopyShareLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/share/${slug}`;
      navigator.clipboard.writeText(url);
      toast.success("Shareable chat link copied to clipboard!");
    }
  };

  const samplePrompts = [
    {
      title: "Inspection Checklist",
      desc: "What are the recommended routine inspection and maintenance procedures?",
      prompt: "What are the recommended routine inspection and maintenance procedures?",
    },
    {
      title: "Safety & Lockout",
      desc: "What safety protocols and lockout/tagout procedures are required?",
      prompt: "What safety protocols and lockout/tagout procedures are required for this equipment?",
    },
    {
      title: "Error Diagnostics",
      desc: "How do I troubleshoot system alarms or diagnostic error codes?",
      prompt: "How do I troubleshoot system alarms and diagnostic error codes according to the manual?",
    },
    {
      title: "Part Specs & Limits",
      desc: "What are the operating limits, torque specifications, and replacement intervals?",
      prompt: "What are the documented operating limits, torque specifications, and replacement intervals?",
    },
  ];

  if (orgLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-8 text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Connecting to maintenance assistant...
          </p>
        </div>
      </div>
    );
  }

  if (orgError || !orgData) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">Assistant Unavailable</h1>
          <p className="text-sm text-muted-foreground">
            {orgError || "The requested maintenance assistant could not be found."}
          </p>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Go to Cube AI
          </Link>
        </div>
      </div>
    );
  }

  const { organization, profile, settings, documentCount, documents } = orgData;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/50">
      <PdfViewerPanel target={pdfTarget} onClose={() => setPdfTarget(null)} />

      {/* Top Header with Company Information */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-zinc-200/80 bg-background/90 px-4 backdrop-blur-md dark:border-zinc-800/80 md:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/60 overflow-hidden shadow-xs">
            {profile.logo ? (
              <Image
                src={profile.logo}
                alt={organization.name}
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            ) : (
              <Building2 className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
                {organization.name}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[0.68rem] font-medium text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3" />
                Verified Assistant
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {settings.companySlogan || profile.industry || "Official Technical Maintenance Portal"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyShareLink}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full text-xs font-medium"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share Link
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 rounded-full"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-xs text-muted-foreground hover:text-foreground hidden md:inline-flex",
            )}
          >
            Cube AI Login
          </Link>
        </div>
      </header>

      {/* Main Chat Interface */}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-background via-background/60 to-transparent" />

        {isLoadingHistory ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="size-8 text-muted-foreground" />
          </div>
        ) : !hasMessages && !isSending ? (
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8 overflow-y-auto">
            <div className="flex max-w-2xl flex-col items-center text-center space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {organization.name} Technical Knowledge Portal
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                How can I help with {organization.name}&apos;s systems?
              </h2>

              <p className="max-w-lg text-sm text-muted-foreground">
                Ask any question regarding equipment manuals, troubleshooting guides, safety protocols, error codes, and maintenance procedures.
              </p>

              {/* Maintenance Resources Pill */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  {documentCount} {documentCount === 1 ? "Technical Manual" : "Technical Manuals"} Available
                </span>
                {profile.industry && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
                    <Wrench className="h-3.5 w-3.5 text-primary" />
                    {profile.industry}
                  </span>
                )}
              </div>

              {/* Sample Prompts Grid */}
              <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3 pt-4 text-left">
                {samplePrompts.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => handleSend(e, item.prompt)}
                    className="group flex flex-col rounded-2xl border border-zinc-200 bg-background/80 p-4 transition-all hover:border-primary/40 hover:bg-muted/40 hover:shadow-sm dark:border-zinc-800"
                  >
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                      {item.title}
                      <Send className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <ChatInputForm
              input={input}
              setInput={setInput}
              onSubmit={handleSend}
              disabled={isSending}
              placeholder={`Ask a question about ${organization.name}'s equipment...`}
              className="mt-8 w-full max-w-2xl"
            />
          </div>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              <div className="max-w-4xl mx-auto w-full space-y-6 py-6">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-4 ${
                      msg.role === "user"
                        ? "ml-auto flex-row-reverse max-w-[85%]"
                        : "w-full"
                    }`}
                  >
                    <div
                      className={`flex flex-col gap-2 ${
                        msg.role === "user"
                          ? "items-end"
                          : "items-start w-full"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="w-full text-foreground">
                          {msg.content.trim() ? (
                            <>
                              <Markdown
                                content={msg.content}
                                citations={msg.citations ?? []}
                                onCitationClick={openCitation}
                              />
                              <CitationSources
                                citations={msg.citations ?? []}
                                onOpen={openCitation}
                              />
                            </>
                          ) : (
                            <TypingIndicator />
                          )}
                        </div>
                      ) : (
                        <div className="px-4 py-3 rounded-2xl bg-primary text-primary-foreground">
                          <p className="leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isSending &&
                  messages[messages.length - 1]?.role !== "assistant" && (
                    <TypingIndicator />
                  )}
              </div>
            </div>

            <div className="relative z-20 shrink-0 px-4 pb-4 pt-2 max-w-4xl mx-auto w-full bg-gradient-to-t from-zinc-50/70 to-transparent dark:from-zinc-950/70">
              <ChatInputForm
                input={input}
                setInput={setInput}
                onSubmit={handleSend}
                disabled={isSending}
                placeholder={`Ask ${organization.name}'s maintenance assistant...`}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function PublicSharePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      }
    >
      <PublicChatContent />
    </Suspense>
  );
}
