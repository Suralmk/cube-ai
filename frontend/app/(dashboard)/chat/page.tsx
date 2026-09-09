"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Send } from "lucide-react";
import { toast } from "sonner";
import {
  createChatSession,
  fetchSessionMessages,
  streamChatMessage,
  type Citation,
} from "@/lib/api/chat";
import { ApiError } from "@/lib/api-client";
import { Markdown } from "@/components/markdown";
import { PdfViewerPanel, type PdfTarget } from "@/components/pdf-viewer-panel";
import { FileText } from "lucide-react";

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
  className = "",
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
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
          placeholder="Ask about a specific manual or issue..."
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
        AI can make mistakes. Verify critical information in the source manual.
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

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(!!sessionId);
  const [isSending, setIsSending] = useState(false);
  const [pdfTarget, setPdfTarget] = useState<PdfTarget | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeSessionRef = useRef<string | null>(sessionId);
  const skipNextLoadRef = useRef(false);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    activeSessionRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchSessionMessages(sessionId)
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
      .catch((error) => {
        if (cancelled) return;
        setMessages([]);
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Failed to load chat history",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isSending]);

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const content = input.trim();
      if (!content || isSending) return;

      setIsSending(true);
      setInput("");

      const tempUserId = `temp-user-${Date.now()}`;
      const assistantId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: tempUserId, role: "user", content },
        { id: assistantId, role: "assistant", content: "" },
      ]);

      let receivedDelta = false;
      try {
        let activeSessionId = activeSessionRef.current;

        if (!activeSessionId) {
          const session = await createChatSession(
            content.slice(0, 80) || "New chat",
          );
          activeSessionId = session.id;
          activeSessionRef.current = session.id;
          skipNextLoadRef.current = true;
          router.replace(`/chat?session=${activeSessionId}`);
          window.dispatchEvent(new Event("cube-ai:chat-sessions-changed"));
        }

        await streamChatMessage(activeSessionId, content, {
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
        // Keep any tokens already streamed; only roll back when nothing arrived.
        if (!receivedDelta) {
          setMessages((prev) =>
            prev.filter((m) => m.id !== tempUserId && m.id !== assistantId),
          );
          setInput(content);
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
    [input, isSending, router],
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
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full min-h-0 flex-1 overflow-hidden">
      <PdfViewerPanel target={pdfTarget} onClose={() => setPdfTarget(null)} />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-white via-white/70 to-white/0 dark:from-zinc-950 dark:via-zinc-950/70 dark:to-zinc-950/0" />

      {!hasMessages && !isSending ? (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 min-h-0">
          <div className="flex flex-col items-center text-center mb-8 max-w-lg">
            <h2 className="text-xl font-semibold tracking-tight">
              What do you need help with?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask about torque specs, safety procedures, part numbers, or
              troubleshooting.
            </p>
          </div>
          <ChatInputForm
            input={input}
            setInput={setInput}
            onSubmit={handleSend}
            disabled={isSending}
            className="w-full max-w-2xl"
          />
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            <div className="max-w-4xl mx-auto w-full space-y-6 py-4">
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

          <div className="relative z-20 shrink-0 px-4 pb-3 pt-2 max-w-4xl mx-auto w-full bg-gradient-to-t from-zinc-50/50 to-transparent dark:from-zinc-950/50">
            <ChatInputForm
              input={input}
              setInput={setInput}
              onSubmit={handleSend}
              disabled={isSending}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
