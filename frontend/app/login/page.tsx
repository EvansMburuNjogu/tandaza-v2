import { Suspense } from "react"
import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"
import { Spinner } from "@/components/ui/spinner"

export const metadata: Metadata = {
  title: "Sign in to Tandaza",
  description: "Access your Tandaza expo workspace for visitors, exhibitors, organizers, sponsors, and administrators."
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
