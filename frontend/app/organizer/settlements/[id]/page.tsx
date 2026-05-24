"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { StatusBadge } from "@/components/admin/status-badge"
import { BackLink } from "@/components/ui/back-link"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { ErrorState } from "@/components/ui/error-state"
import { formatCurrency, formatDate } from "@/lib/utils"

export default function SettlementInvoicePage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)

  const settlementsQuery = useQuery({
    queryKey: ["organizer-settlements"],
    queryFn: () => api.getOrganizerSettlements(token || ""),
    enabled: Boolean(token)
  })

  if (settlementsQuery.isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (settlementsQuery.isError) return <ErrorState onRetry={() => settlementsQuery.refetch()} />

  const settlement = settlementsQuery.data?.find(s => s.id === params.id)
  if (!settlement) return <ErrorState title="Settlement not found" message="The requested settlement could not be found." />
  const isDisbursed = settlement.status === "disbursed"
  const hasBankDetails = settlement.payoutMethod === "bank" && Boolean(settlement.bankName || settlement.accountNumber || settlement.accountName)
  const hasMobileDetails = settlement.payoutMethod === "mobile_money" && Boolean(settlement.mobileProvider || settlement.mobileNumber || settlement.accountName)
  const hasPayoutDetails = hasBankDetails || hasMobileDetails || settlement.payoutMethod === "manual"

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="settlement-screen-only flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BackLink href="/organizer/settlements" label="Back to Settlements" />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handlePrint}>
            Download / Print
          </Button>
        </div>
      </div>

      <div className="settlement-print-area mx-auto max-w-4xl">
        <div className="settlement-card overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl print:shadow-none">
          <div className="relative overflow-hidden bg-[#140822] px-8 py-8 text-white">
            <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.34),transparent_45%)]" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <img src="/tandaza-logo-white-v2.png" alt="Tandaza" className="h-16 w-32 object-contain" />
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight">Settlement Invoice</h1>
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-left backdrop-blur sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Payout Due</p>
                <p className="mt-2 text-3xl font-bold tracking-tight">{formatCurrency(settlement.netAmount, settlement.currency)}</p>
                <p className="mt-1 text-xs text-white/60">{settlement.reference}</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Settlement Reference</p>
                <p className="mt-2 break-all font-mono text-sm font-semibold text-slate-900">{settlement.reference}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Invoice Date</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(settlement.createdAt)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Status</p>
                <div className="mt-2">
                  <StatusBadge value={settlement.status} />
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Settlement For</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">{settlement.expo}</p>
                <p className="mt-1 text-sm text-slate-500">Period: {settlement.period}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Payee</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">Organizer</p>
                <p className="mt-1 text-sm text-slate-500">Commission settlement from paid exhibitor activations.</p>
              </div>
            </div>

            <div className="mt-8 grid gap-8">
              <div>
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Payment Breakdown</p>
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Description</th>
                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      <tr>
                        <td className="px-5 py-3 text-slate-700">Gross Revenue</td>
                        <td className="px-5 py-3 text-right font-mono font-semibold text-slate-950">{formatCurrency(settlement.amount, settlement.currency)}</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-3 text-slate-700">Organizer Commission ({settlement.commissionRate}%)</td>
                        <td className="px-5 py-3 text-right font-mono font-semibold text-primary">{formatCurrency(settlement.commission, settlement.currency)}</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-3 text-slate-700">Platform Retained</td>
                        <td className="px-5 py-3 text-right font-mono font-semibold text-slate-950">{formatCurrency(Math.max(settlement.amount - settlement.commission, 0), settlement.currency)}</td>
                      </tr>
                      <tr className="bg-purple-50/80">
                        <td className="px-5 py-4 text-base font-semibold text-slate-950">Payout Due To Organizer</td>
                        <td className="px-5 py-4 text-right font-mono text-xl font-bold text-primary">{formatCurrency(settlement.netAmount, settlement.currency)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Payout Details</p>
                {hasPayoutDetails ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="text-sm text-slate-500">Payment Method</p>
                      <p className="mt-1 font-medium capitalize">{(settlement.payoutMethod || "manual").replaceAll("_", " ")}</p>
                    </div>
                    {settlement.accountName ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <p className="text-sm text-slate-500">Account Name</p>
                        <p className="mt-1 font-medium">{settlement.accountName}</p>
                      </div>
                    ) : null}
                    {settlement.payoutMethod === "bank" ? (
                      <>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                          <p className="text-sm text-slate-500">Bank Name</p>
                          <p className="mt-1 font-medium">{settlement.bankName || "Not provided"}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                          <p className="text-sm text-slate-500">Account Number</p>
                          <p className="mt-1 font-mono font-medium">{settlement.accountNumber || "Not provided"}</p>
                        </div>
                        {settlement.bankBranch ? (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <p className="text-sm text-slate-500">Branch</p>
                            <p className="mt-1 font-medium">{settlement.bankBranch}</p>
                          </div>
                        ) : null}
                        {settlement.swiftCode ? (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <p className="text-sm text-slate-500">SWIFT Code</p>
                            <p className="mt-1 font-mono font-medium">{settlement.swiftCode}</p>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    {settlement.payoutMethod === "mobile_money" ? (
                      <>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                          <p className="text-sm text-slate-500">Provider</p>
                          <p className="mt-1 font-medium">{settlement.mobileProvider || "Not provided"}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                          <p className="text-sm text-slate-500">Mobile Number</p>
                          <p className="mt-1 font-mono font-medium">{settlement.mobileNumber || "Not provided"}</p>
                        </div>
                      </>
                    ) : null}
                    {settlement.payoutNotes ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:col-span-2">
                        <p className="text-sm text-slate-500">Payout Notes</p>
                        <p className="mt-1 whitespace-pre-line font-medium">{settlement.payoutNotes}</p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-elevated/40 p-4">
                    <p className="text-sm text-slate-500">
                      No payout method is configured yet. Add payout details in Organizer Settings before settlement disbursement.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-5">
                <p className="text-sm text-slate-500">
                  {isDisbursed
                    ? "This settlement has been processed and the organizer commission has been disbursed to your registered payout account."
                    : "This settlement is still in review. The organizer commission will be released after administrator approval and payout processing."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-8 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <img src="/tandaza-logo-v2.png" alt="Tandaza" className="h-8 w-20 object-contain" />
            <p>hello@tandaza.africa · +254 799 010 210</p>
          </div>
        </div>
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

          .settlement-print-area,
          .settlement-print-area * {
            visibility: visible;
          }

          .settlement-print-area {
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            max-width: none !important;
            margin: 0 !important;
          }

          .settlement-screen-only,
          .settlement-screen-only * {
            display: none !important;
          }

          .settlement-card {
            border-radius: 18px !important;
            box-shadow: none !important;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
