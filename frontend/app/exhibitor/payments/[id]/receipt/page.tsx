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
import { formatCurrency, safeDisplay } from "@/lib/utils"

export default function PaymentReceiptPage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)
  
  const query = useQuery({
    queryKey: ["payment-receipt", params.id],
    queryFn: () => api.getExhibitorPaymentReceipt(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  if (query.isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (!query.data) return <ErrorState title="Receipt not found" message="Payment record not found." />

  const receipt = query.data
  const payerName = safeDisplay(receipt.payerName, "Customer")
  const payerEmail = safeDisplay(receipt.payerEmail, "")
  const payeeName = safeDisplay(receipt.payeeName, "Tandaza")

  function handlePrint() {
    window.print()
  }

  function handleDownload() {
    const content = document.getElementById("receipt-content")
    if (!content) return
    
    const printContent = content.innerHTML
    const printWindow = window.open("", "_blank")
    if (!printWindow) return
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${receipt.reference}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
            .title { font-size: 18px; color: #6366f1; }
            .section { margin: 20px 0; padding: 15px 0; border-bottom: 1px solid #e5e7eb; }
            .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
            .value { font-size: 16px; font-weight: 500; margin-top: 4px; }
            .amount { font-size: 28px; font-weight: bold; text-align: right; margin: 20px 0; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: #dcfce7; color: #166534; font-weight: 500; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="space-y-6">
      <BackLink href="/exhibitor/payments" label="Back to Payments" />

      <div className="receipt-screen-only flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Payment Receipt</h1>
          <p className="text-slate-500">Receipt for payment {receipt.reference}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handlePrint}>Print</Button>
          <Button onClick={handleDownload}>Download PDF</Button>
        </div>
      </div>

      <div id="receipt-content" className="receipt-print-area max-w-2xl mx-auto">
        <Card className="receipt-card p-8">
          {/* Header */}
          <div className="text-center border-b border-border pb-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-white shadow-sm">
              <img src="/tandaza-logo.png" alt="Tandaza" className="h-7 w-7" />
            </div>
            <div className="mt-3 text-2xl font-bold text-foreground">Tandaza</div>
            <p className="text-lg text-primary mt-1">Payment Receipt</p>
          </div>

          {/* Receipt Info */}
          <div className="py-6 border-b border-border">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Receipt Number</p>
                <p className="text-lg font-mono font-semibold mt-1">{receipt.reference}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Date</p>
                <p className="text-lg mt-1">{new Date(receipt.paidAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="py-6 border-b border-border">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">From</p>
                <p className="text-lg font-semibold mt-1">{payeeName}</p>
                <p className="text-sm text-slate-500">Platform Services</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">To</p>
                <p className="text-lg font-semibold mt-1">{payerName}</p>
                {payerEmail ? <p className="text-sm text-slate-500">{payerEmail}</p> : null}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="py-6 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Description</p>
            <div className="mt-2 p-3 bg-elevated rounded-lg">
              <p className="font-medium">{receipt.entityId}</p>
              <p className="text-sm text-slate-500 mt-1">{receipt.description}</p>
            </div>
          </div>

          {/* Amount Breakdown */}
          <div className="py-6 border-b border-border">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Digital workspace activation</span>
                <span className="font-mono">{formatCurrency(receipt.amount - (receipt.processingFee || 0) - (receipt.adsAddonPaid ? receipt.adsAddonFee || 0 : 0), receipt.currency)}</span>
              </div>
              {receipt.adsAddonPaid ? (
                <div className="flex justify-between">
                  <span className="text-slate-500">Ads add-on</span>
                  <span className="font-mono">{formatCurrency(receipt.adsAddonFee || 0, receipt.currency)}</span>
                </div>
              ) : null}
              {receipt.processingFee ? (
                <div className="flex justify-between">
                  <span className="text-slate-500">Processing fee</span>
                  <span className="font-mono">{formatCurrency(receipt.processingFee, receipt.currency)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-mono">{formatCurrency(receipt.amount, receipt.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">VAT (0%)</span>
                <span className="font-mono">{formatCurrency(receipt.tax, receipt.currency)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-border">
                <span className="text-lg font-semibold">TOTAL</span>
                <span className="text-2xl font-bold font-mono">{formatCurrency(receipt.total, receipt.currency)}</span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="py-6 border-b border-border">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payment Method</p>
                <p className="text-lg mt-1">{receipt.paymentMethod}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</p>
                <div className="mt-1">
                  <span className="inline-flex items-center rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">
                    ✓ {receipt.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-6 text-center">
            <p className="text-slate-500">Thank you for your business!</p>
            <p className="text-xs text-slate-400 mt-2">Receipt generated on {new Date(receipt.issuedAt).toLocaleString()}</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
