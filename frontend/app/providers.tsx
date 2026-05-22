"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { Toaster } from "sonner"
import { ConfirmProvider } from "@/components/ui/confirm-provider"
import { SessionBootstrap } from "@/components/auth/session-bootstrap"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <SessionBootstrap />
        {children}
        <Toaster richColors closeButton position="top-right" />
      </ConfirmProvider>
    </QueryClientProvider>
  )
}
