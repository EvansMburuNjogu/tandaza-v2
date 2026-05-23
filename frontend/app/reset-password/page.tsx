import { Suspense } from "react"
import type { Metadata } from "next"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { Spinner } from "@/components/ui/spinner"

export const metadata: Metadata = {
  title: "Choose a new Tandaza password",
  description: "Set a new Tandaza password with your emailed reset link and continue to your account."
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
