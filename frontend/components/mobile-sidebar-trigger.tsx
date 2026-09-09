"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

/** Visible only on mobile, where the sidebar is a closed sheet by default. */
export function MobileSidebarTrigger() {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-border/60 bg-background/90 px-3 py-2 backdrop-blur md:hidden">
      <SidebarTrigger aria-label="Open menu" />
      <span className="text-sm font-medium text-foreground">Menu</span>
    </div>
  );
}
