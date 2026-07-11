"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Send, Sparkles } from "lucide-react";
import {
  createChatSession,
  fetchSessionMessages,
  sendChatMessage,
} from "@/lib/api/chat";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

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
      <form onSubmit={onSubmit} className="relative flex items-center">
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
          className="absolute right-1.5 h-9 w-9 rounded-full"
          disabled={!input.trim() || disabled}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground mt-2">
        AI can make mistakes. Verify critical information in the source manual.
      </p>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
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
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!hasMessages || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, hasMessages]);

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const content = input.trim();
      if (!content || isSending) return;

      setIsSending(true);
      setInput("");

      try {
        let activeSessionId = sessionId;

        if (!activeSessionId) {
          const session = await createChatSession(
            content.slice(0, 80) || "New chat",
          );
          activeSessionId = session.id;
          router.replace(`/chat?session=${activeSessionId}`);
        }

        const { userMessage, assistantMessage } = await sendChatMessage(
          activeSessionId,
          content,
        );

        setMessages((prev) => [
          ...prev,
          {
            id: userMessage.id,
            role: "user",
            content: userMessage.content,
          },
          {
            id: assistantMessage.id,
            role: "assistant",
            content: assistantMessage.content,
          },
        ]);
      } catch {
        setInput(content);
      } finally {
        setIsSending(false);
      }
    },
    [input, isSending, router, sessionId],
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full min-h-0 flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-white via-white/70 to-white/0 dark:from-zinc-950 dark:via-zinc-950/70 dark:to-zinc-950/0" />

      <div className="relative z-20 shrink-0 px-4 pt-6 pb-2 max-w-4xl mx-auto w-full">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Knowledge Chat
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Search across your organization&apos;s maintenance manuals and documents.
        </p>
      </div>

      {!hasMessages ? (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 min-h-0">
          <div className="flex flex-col items-center text-center mb-8 max-w-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              What do you need help with?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask about torque specs, safety procedures, part numbers, or
              troubleshooting — answers are grounded in your uploaded manuals.
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
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
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
