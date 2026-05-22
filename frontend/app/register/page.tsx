import { Suspense } from "react"
import type { Metadata } from "next"
import { RegisterForm } from "@/components/auth/register-form"
import { Spinner } from "@/components/ui/spinner"

export const metadata: Metadata = {
  title: "Tandaza registration",
  description: "Tandaza visitor registration is currently invite-only. Existing users can sign in to access expo discovery and exhibitor workspaces."
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div>}>
      <RegisterForm />
    </Suspense>
  )
}
