import { redirect } from "next/navigation"

export default function EmailSettingsRedirectPage() {
  redirect("/administrator/settings?tab=email")
}
