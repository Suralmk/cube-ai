import { Suspense } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardGate } from "@/components/dashboard-gate";

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
          <main className="flex flex-1 flex-col min-h-0 min-w-0 bg-zinc-50/50 dark:bg-zinc-950/50">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </DashboardGate>
  );
}
