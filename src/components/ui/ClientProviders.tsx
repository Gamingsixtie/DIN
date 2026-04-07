"use client";

import { ToastProvider } from "@/components/ui/Toast";
import { SyncStatusProvider } from "@/lib/sync-status-context";
import { SyncStatusFooter } from "@/components/ui/SyncStatusFooter";
import type { ReactNode } from "react";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SyncStatusProvider>
        {children}
        <SyncStatusFooter />
      </SyncStatusProvider>
    </ToastProvider>
  );
}
