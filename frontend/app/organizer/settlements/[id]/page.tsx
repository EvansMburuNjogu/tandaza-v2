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

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <BackLink href="/organizer/settlements" label="Back to Settlements" />
        <div className="flex gap-2 no-print">
          <Button variant="secondary" onClick={handlePrint}>
            Download / Print
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden print:shadow-none print:border">
          <div className="bg-primary p-8 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">SETTLEMENT INVOICE</h1>
                <p className="mt-1 text-primary-foreground/80">Tandaza Platform</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary-foreground/80">Invoice Date</p>
                <p className="font-semibold">{formatDate(settlement.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid gap-8">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-1">Settlement Reference</p>
                  <p className="text-lg font-mono font-semibold">{settlement.reference}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-1">Status</p>
                  <StatusBadge value={settlement.status} />
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-4">Settlement Details</p>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="p-4 rounded-xl bg-elevated/50">
                    <p className="text-sm text-slate-500">Expo</p>
                    <p className="mt-1 font-semibold">{settlement.expo}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-elevated/50">
                    <p className="text-sm text-slate-500">Period</p>
                    <p className="mt-1 font-semibold">{settlement.period}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-4">Payment Breakdown</p>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-elevated/80">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Description</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="px-4 py-3 text-slate-600">Gross Revenue</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(settlement.amount, settlement.currency)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-slate-600">Platform Commission ({settlement.commissionRate}%)</td>
                        <td className="px-4 py-3 text-right font-mono text-primary">-{formatCurrency(settlement.commission, settlement.currency)}</td>
                      </tr>
                      <tr className="bg-success/5">
                        <td className="px-4 py-3 font-semibold">Net Payout</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-success">{formatCurrency(settlement.netAmount, settlement.currency)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-4">Bank Details</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-elevated/50">
                    <p className="text-sm text-slate-500">Bank Name</p>
                    <p className="mt-1 font-medium">{settlement.bankName}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-elevated/50">
                    <p className="text-sm text-slate-500">Account Number</p>
                    <p className="mt-1 font-mono font-medium">{settlement.accountNumber}</p>
                  </div>
                </div>
              </div>

              <div className="bg-elevated/50 p-4 rounded-xl">
                <p className="text-sm text-slate-500">
                  {isDisbursed
                    ? "This settlement has been processed and the net amount has been disbursed to your registered payout account."
                    : "This settlement is still in review. The net amount will be released after administrator approval and payout processing."}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border bg-slate-50 px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Tandaza</span>
            </div>
            <p className="text-sm text-slate-400">support@tandaza.co.ke • +254 700 000 000</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media print {
          .no-print { display: none; }
          body { background: white; }
          .bg-white { box-shadow: none; border: 1px solid #e2e8f0; }
        }
      `}</style>
    </div>
  )
}
