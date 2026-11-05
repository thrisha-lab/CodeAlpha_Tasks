"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useEffect, useState } from "react";
import { AppToaster } from "@/components/storefront/app-toaster";
import { initTheme } from "@/store/ui-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    initTheme();
  }, []);

  return (
    <SessionProvider>
      <QueryClientProvider client={client}>
        {children}
        <AppToaster />
      </QueryClientProvider>
    </SessionProvider>
  );
}
