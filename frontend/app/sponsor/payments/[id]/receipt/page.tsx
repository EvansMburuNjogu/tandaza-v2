"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { BackLink } from "@/components/ui/back-link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { SessionGuard } from "@/components/auth/session-guard"
import { formatCurrency, safeDisplay } from "@/lib/utils"

export default function SponsorPaymentReceiptPage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)

  const { data: receipt, isLoading, error } = useQuery({
    queryKey: ["sponsor-payment-receipt", params.id],
    queryFn: () => api.getSponsorPaymentReceipt(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  if (isLoading || !receipt) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm font-medium text-slate-500">Loading receipt...</p>
      </div>
    )
  }

  if (error) return <ErrorState title="Receipt not found" />

  const r = receipt
  const payerName = safeDisplay(r.payerName, "Customer")
  const payerEmail = safeDisplay(r.payerEmail, "")
  const payeeName = safeDisplay(r.payeeName, "Tandaza")

  function handlePrint() {
    window.print()
  }

  return (
    <SessionGuard allowedRoles={["sponsorship"]}>
      <div className="max-w-2xl mx-auto space-y-6">
        <BackLink href="/sponsor/payments" label="Back to Payments" />

        <div className="receipt-print-area bg-background border border-border rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-primary to-accent p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 shadow-sm">
                  <img src="/tandaza-logo.svg" alt="Tandaza" className="h-7 w-7" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Payment Receipt</p>
                <div className="text-2xl font-bold mt-1">Tandaza</div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{r.reference}</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">From</p>
                <p className="mt-1 font-medium">{payeeName}</p>
                <p className="text-sm text-slate-500">Platform Services</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">To</p>
                <p className="mt-1 font-medium">{payerName}</p>
                {payerEmail ? <p className="text-sm text-slate-500">{payerEmail}</p> : null}
              </div>
            </div>

            <div className="py-6 border-y border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ad Details</p>
              <div className="mt-2 p-3 bg-elevated rounded-lg">
                <p className="font-medium">{r.expoName}</p>
                <p className="text-sm text-slate-500 mt-1">{r.description}</p>
              </div>
            </div>

            <div className="py-6 border-b border-border">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-mono">{formatCurrency(r.amount, r.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Platform Fee</span>
                  <span className="font-mono">{formatCurrency(r.platformFee, r.currency)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-border">
                  <span className="text-lg font-semibold">Total Paid</span>
                  <span className="text-2xl font-bold font-mono text-success">{formatCurrency(r.total, r.currency)}</span>
                </div>
              </div>
            </div>

            <div className="py-6 border-b border-border">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payment Method</p>
                  <p className="text-lg mt-1 capitalize">{r.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</p>
                  <div className="mt-1">
                    <span className="inline-flex items-center rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">
                      PAID
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="receipt-screen-only flex items-center justify-between pt-4">
              <div>
                <p className="text-xs text-slate-400">Date: {new Date(r.paidAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handlePrint}>Print</Button>
                <Button onClick={handlePrint}>Download PDF</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SessionGuard>
  )
}
