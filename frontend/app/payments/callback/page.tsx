"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<PaymentCallbackShell message="Preparing payment confirmation..." />}>
      <PaymentCallback />
    </Suspense>
  )
}

function PaymentCallback() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const hydrated = useSessionStore((s) => s.hydrated)
  const reference = searchParams.get("reference") || searchParams.get("trxref") || ""

  useEffect(() => {
    if (!hydrated) return
    if (!token) {
      toast.error("Please sign in to confirm your payment.")
      router.replace(`/login?next=${encodeURIComponent(`/payments/callback?reference=${reference}`)}`)
      return
    }
    if (!reference) {
      toast.error("Payment reference is missing.")
      router.replace("/exhibitor/expos")
      return
    }

    let cancelled = false
    async function verifyPayment() {
      try {
        const response = await api.verifyExhibitorPaystackPayment(token || "", reference)
        if (cancelled) return
        toast.success("Payment confirmed. Your expo workspace is active.")
        router.replace(response.redirectTo || `/exhibitor/payments/${response.payment.id}/receipt`)
      } catch (error) {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : "Could not confirm payment.")
        router.replace("/exhibitor/payments")
      }
    }
    verifyPayment()
    return () => {
      cancelled = true
    }
  }, [hydrated, token, reference, router])

  return <PaymentCallbackShell message="Confirming your Paystack payment..." />
}

function PaymentCallbackShell({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <Spinner className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-foreground">Payment confirmation</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
      </Card>
    </main>
  )
}
