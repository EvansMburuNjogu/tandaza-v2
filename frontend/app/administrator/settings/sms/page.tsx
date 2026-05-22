import { redirect } from "next/navigation"

export default function SmsSettingsRedirectPage() {
  redirect("/administrator/settings?tab=sms")
}
