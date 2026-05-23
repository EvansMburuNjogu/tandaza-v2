import type { Metadata } from "next"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata: Metadata = {
  title: "Reset your Tandaza password",
  description: "Request a secure Tandaza password reset link by email and return to your account."
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
