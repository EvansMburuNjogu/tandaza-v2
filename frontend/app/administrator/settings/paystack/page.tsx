import { redirect } from "next/navigation"

export default function PaystackSettingsRedirectPage() {
  redirect("/administrator/settings?tab=paystack")
}
