"use client";

import { Toaster as Sonner } from "sonner";
import { useUIStore } from "@/store/ui-store";

export function AppToaster() {
  const theme = useUIStore((s) => s.theme);
  return (
    <Sonner
      position="top-right"
      theme={theme}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "rounded-lg border border-border",
        },
      }}
    />
  );
}
