"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { BackLink } from "@/components/ui/back-link"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { ErrorState } from "@/components/ui/error-state"
import { formatCurrency, formatDate, safeDisplay } from "@/lib/utils"

export default function OrganizerPaymentReceiptPage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)
  
  const query = useQuery({
    queryKey: ["organizer-payment-receipt", params.id],
    queryFn: () => api.getOrganizerPaymentReceipt(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  if (query.isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (!query.data) return <ErrorState title="Receipt not found" message="Payment record not found." />

  const receipt = query.data
  const payerName = safeDisplay(receipt.payerName, "Customer")
  const payerEmail = safeDisplay(receipt.payerEmail, "")
  const activationAmount = receipt.amount - (receipt.processingFee || 0) - (receipt.adsAddonPaid ? receipt.adsAddonFee || 0 : 0)

  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-6">
      <BackLink href="/organizer/payments" label="Back to Payments" />

      <div className="receipt-screen-only flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payment Receipt</h1>
          <p className="text-sm text-slate-500">Receipt for payment {receipt.reference}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handlePrint}>Download / Print</Button>
        </div>
      </div>

      <div className="receipt-print-area mx-auto max-w-4xl">
        <Card className="receipt-card overflow-hidden border-slate-200 bg-white p-0 shadow-xl print:shadow-none">
          <div className="relative overflow-hidden bg-[#140822] px-8 py-7 text-white">
            <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.34),transparent_45%)]" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <img src="/tandaza-logo-white-v2.png" alt="Tandaza" className="h-16 w-32 object-contain" />
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight">Payment Receipt</h2>
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-left backdrop-blur sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Total Paid</p>
                <p className="mt-2 text-3xl font-bold tracking-tight">{formatCurrency(receipt.amount, receipt.currency)}</p>
                <p className="mt-1 text-xs text-white/60">{receipt.reference}</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Receipt Number</p>
                <p className="mt-2 break-all font-mono text-sm font-semibold text-slate-900">{receipt.reference}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Paid On</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(receipt.paidAt)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Status</p>
                <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                  {receipt.status}
                </span>
              </div>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">From</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">Tandaza</p>
                <p className="mt-1 text-sm text-slate-500">Platform Services</p>
                <p className="mt-3 text-xs leading-5 text-slate-500">Expo activation, digital booth services, payment processing, and organizer commission tracking.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">To</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">{payerName}</p>
                {payerEmail ? <p className="mt-1 text-sm text-slate-500">{payerEmail}</p> : null}
                <p className="mt-3 text-xs leading-5 text-slate-500">{receipt.expoName}</p>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Payment Details</p>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <p className="text-base font-semibold text-slate-950">{receipt.expoName}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{receipt.description}</p>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Description</th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  <ReceiptRow label="Digital workspace activation" value={formatCurrency(activationAmount, receipt.currency)} />
                  {receipt.adsAddonPaid ? <ReceiptRow label="Ads add-on" value={formatCurrency(receipt.adsAddonFee || 0, receipt.currency)} /> : null}
                  {receipt.processingFee ? <ReceiptRow label="Processing fee" value={formatCurrency(receipt.processingFee, receipt.currency)} /> : null}
                  <ReceiptRow label="Subtotal" value={formatCurrency(receipt.amount, receipt.currency)} />
                  <ReceiptRow label="Platform share" value={formatCurrency(receipt.platformFee, receipt.currency)} muted />
                  <tr className="bg-purple-50/80">
                    <td className="px-5 py-4 text-base font-semibold text-slate-950">Organizer share</td>
                    <td className="px-5 py-4 text-right font-mono text-xl font-bold text-primary">{formatCurrency(receipt.organizerShare, receipt.currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Payment Method</p>
                <p className="mt-2 text-base font-semibold capitalize text-slate-950">{receipt.paymentMethod || "Paystack"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Issued On</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{formatDate(receipt.issuedAt)}</p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-purple-100 bg-purple-50/60 p-5 text-center">
              <p className="text-sm font-semibold text-slate-950">Thank you for using Tandaza.</p>
              <p className="mx-auto mt-1 max-w-xl text-xs leading-5 text-slate-500">
                This receipt confirms a recorded Tandaza payment and organizer commission split for the expo workspace.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-8 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <img src="/tandaza-logo-v2.png" alt="Tandaza" className="h-8 w-20 object-contain" />
            <p>hello@tandaza.africa · +254 799 010 210</p>
          </div>
        </Card>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          body {
            background: #ffffff !important;
          }

          body * {
            visibility: hidden;
          }

          .receipt-print-area,
          .receipt-print-area * {
            visibility: visible;
          }

          .receipt-print-area {
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            max-width: none !important;
            margin: 0 !important;
          }

          .receipt-screen-only,
          .receipt-screen-only * {
            display: none !important;
          }

          .receipt-card {
            border-radius: 18px !important;
            box-shadow: none !important;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}

function ReceiptRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <tr>
      <td className={`px-5 py-3 ${muted ? "text-slate-500" : "text-slate-700"}`}>{label}</td>
      <td className={`px-5 py-3 text-right font-mono ${muted ? "text-slate-500" : "font-semibold text-slate-950"}`}>{value}</td>
    </tr>
  )
}
