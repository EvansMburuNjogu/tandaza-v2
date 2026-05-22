import { SettingsPanel } from "@/components/admin/settings-panel"

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const tab = params.tab || "email"
  return <SettingsPanel tab={tab} />
}
