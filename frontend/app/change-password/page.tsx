import { Suspense } from "react"
import { Spinner } from "@/components/ui/spinner"
import { ChangePasswordForm } from "./change-password-form"

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><Spinner className="h-8 w-8 text-primary" /></div>}>
      <ChangePasswordForm />
    </Suspense>
  )
}
