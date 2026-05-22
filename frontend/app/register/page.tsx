import { Suspense } from "react"
import type { Metadata } from "next"
import { RegisterForm } from "@/components/auth/register-form"
import { Spinner } from "@/components/ui/spinner"

export const metadata: Metadata = {
  title: "Create a Tandaza visitor account",
  description: "Register as a Tandaza visitor to discover expos, engage exhibitors remotely, request meetings, and keep your expo activity in one place."
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div>}>
      <RegisterForm />
    </Suspense>
  )
}
