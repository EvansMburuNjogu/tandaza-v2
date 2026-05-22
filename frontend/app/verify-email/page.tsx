import { Suspense } from "react"
import type { Metadata } from "next"
import { VerifyEmailForm } from "@/components/auth/verify-email-form"
import { Spinner } from "@/components/ui/spinner"

export const metadata: Metadata = {
  title: "Verify your Tandaza email",
  description: "Verify your Tandaza account email to activate your visitor access to expo discovery, exhibitor engagement, meetings, and saved activity."
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div>}>
      <VerifyEmailForm />
    </Suspense>
  )
}
