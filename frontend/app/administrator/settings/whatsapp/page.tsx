import { redirect } from "next/navigation"

export default function WhatsappSettingsRedirectPage() {
  redirect("/administrator/settings?tab=whatsapp")
}
