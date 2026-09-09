import { Suspense } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardGate } from "@/components/dashboard-gate";
import { MobileSidebarTrigger } from "@/components/mobile-sidebar-trigger";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGate>
      <SidebarProvider>
        <div className="flex h-svh w-full overflow-hidden bg-white dark:bg-black">
          <Suspense fallback={null}>
            <AppSidebar />
          </Suspense>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-zinc-50/50 dark:bg-zinc-950/50">
            <MobileSidebarTrigger />
            {children}
          </main>
        </div>
      </SidebarProvider>
    </DashboardGate>
  );
}
