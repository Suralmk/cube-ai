"use client";

import { useAuth } from "@/lib/auth-context";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@teispace/next-themes";
import { toast } from "sonner";
import {
  fetchChatSessions,
  updateChatSession,
  deleteChatSession,
  type ChatSession,
} from "@/lib/api/chat";
import { ApiError } from "@/lib/api-client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  FileText, 
  Settings, 
  LogOut,
  Sparkles,
  History,
  Sun,
  Moon,
  Monitor,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Share2,
} from "lucide-react";
import { fetchOrganization } from "@/lib/api/organizations";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { name: "Chat", href: "/chat", icon: Sparkles },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];


function SessionMenuItem({
  session,
  isActive,
  onRenamed,
  onDeleted,
}: {
  session: ChatSession;
  isActive: boolean;
  onRenamed: (session: ChatSession) => void;
  onDeleted: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(session.title);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(session.title);
  }, [session.title]);

  useEffect(() => {
    if (!isEditing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [isEditing]);

  const startRename = () => {
    setMenuOpen(false);
    setTitle(session.title);
    setIsEditing(true);
  };

  const cancelRename = () => {
    setIsEditing(false);
    setTitle(session.title);
  };

  const submitRename = async () => {
    const next = title.trim();
    if (!next || next === session.title) {
      cancelRename();
      return;
    }
    setBusy(true);
    try {
      const updated = await updateChatSession(session.id, next);
      onRenamed(updated);
      setIsEditing(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Failed to rename chat",
      );
      cancelRename();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    setBusy(true);
    try {
      await deleteChatSession(session.id);
      onDeleted(session.id);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Failed to delete chat",
      );
    } finally {
      setBusy(false);
    }
  };

  if (isEditing) {
    return (
      <SidebarMenuItem>
        <input
          ref={inputRef}
          value={title}
          disabled={busy}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submitRename();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelRename();
            }
          }}
          onBlur={cancelRename}
          className="w-full rounded-xl border border-sidebar-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        />
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        render={
          <Link
            href={`/chat?session=${session.id}`}
            className="flex items-center gap-2 w-full"
          />
        }
      >
        <History className="w-4 h-4" />
        <span className="truncate">{session.title}</span>
      </SidebarMenuButton>

      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger
          render={
            <SidebarMenuAction showOnHover aria-label="Chat options">
              <MoreVertical className="w-4 h-4" />
            </SidebarMenuAction>
          }
        />
        <PopoverContent
          align="start"
          side="right"
          className="w-40 gap-1 rounded-xl p-1"
        >
          <button
            type="button"
            onClick={startRename}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Pencil className="w-4 h-4" />
            Rename
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </PopoverContent>
      </Popover>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { state } = useSidebar();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    fetchOrganization()
      .then((bundle) => {
        if (bundle?.organization?.slug) {
          setOrgSlug(bundle.organization.slug);
        }
      })
      .catch(() => {});

    const loadSessions = () => {
      fetchChatSessions()
        .then(setSessions)
        .catch(() => setSessions([]));
    };

    loadSessions();
    window.addEventListener("cube-ai:chat-sessions-changed", loadSessions);
    return () => {
      window.removeEventListener("cube-ai:chat-sessions-changed", loadSessions);
    };
  }, [user]);

  const handleNewChat = () => {
    router.push("/chat");
  };

  const handleRenamed = (updated: ChatSession) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s)),
    );
    window.dispatchEvent(new Event("cube-ai:chat-sessions-changed"));
  };

  const handleDeleted = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    const current = new URLSearchParams(window.location.search).get("session");
    if (current === id) router.push("/chat");
    window.dispatchEvent(new Event("cube-ai:chat-sessions-changed"));
  };

  if (!user) return null;

  return (
    <Sidebar collapsible="icon" className="border-r border-zinc-200 dark:border-zinc-800">
      <SidebarHeader className="p-4">
        <div
          className={`flex ${
            state === "collapsed"
              ? "flex-col items-center gap-4"
              : "items-center justify-between gap-2"
          } px-1`}
        >
          <Link
            href="/chat"
            className={`relative block shrink-0 overflow-hidden rounded-md ${
              state === "collapsed" ? "h-8 w-8" : "h-10 w-40"
            }`}
            aria-label="Cube AI"
          >
            <Image
              src="/logo.png"
              alt="Cube AI"
              fill
              className={
                state === "collapsed"
                  ? "object-cover object-left"
                  : "object-contain object-left"
              }
              sizes={state === "collapsed" ? "32px" : "160px"}
              priority
            />
          </Link>
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={
                        <Link
                          href={item.href}
                          className="flex items-center gap-2 w-full"
                        />
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleNewChat}
                  className="flex items-center gap-2 w-full"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recent Chat Sessions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sessions.length === 0 ? (
                <SidebarMenuItem>
                  <span className="px-2 py-1.5 text-xs text-muted-foreground">
                    No chat sessions yet
                  </span>
                </SidebarMenuItem>
              ) : (
                sessions.map((session) => (
                  <SessionMenuItem
                    key={session.id}
                    session={session}
                    isActive={
                      pathname.startsWith("/chat") &&
                      searchParams.get("session") === session.id
                    }
                    onRenamed={handleRenamed}
                    onDeleted={handleDeleted}
                  />
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-3 w-full hover:bg-zinc-100 dark:hover:bg-zinc-800 p-2 rounded-md transition-colors outline-none"
          >
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start flex-1 overflow-hidden">
              <span className="text-sm font-medium truncate w-full text-left">{user.name}</span>
              <span className="text-xs text-zinc-500 truncate w-full text-left">{user.email}</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push("/settings")}
            >
              <Settings className="w-4 h-4" />
              Settings
            </DropdownMenuItem>

            {orgSlug && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    const url = `${window.location.origin}/share/${orgSlug}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Public chat link copied to clipboard!");
                  }
                }}
              >
                <Share2 className="w-4 h-4" />
                Share Assistant Link
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={theme ?? "system"}
                onValueChange={(value) => setTheme(value)}
              >
                <DropdownMenuRadioItem value="light" className="cursor-pointer">
                  <Sun className="w-4 h-4" />
                  Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark" className="cursor-pointer">
                  <Moon className="w-4 h-4" />
                  Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system" className="cursor-pointer">
                  <Monitor className="w-4 h-4" />
                  System
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              variant="destructive"
              onClick={logout}
              className="cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
