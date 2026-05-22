"use client"

import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { FormEvent, useEffect, useState } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { SettingsFormCard } from "@/components/admin/settings-form-card"
import { SettingsTabs } from "@/components/admin/settings-tabs"
import { ErrorState } from "@/components/ui/error-state"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"

type TestDialogState = {
  channel: "email" | "sms" | "whatsapp"
  title: string
  description: string
  label: string
  placeholder: string
  defaultValue: string
} | null

export function SettingsPanel({ tab }: { tab: string }) {
  const token = useSessionStore((state) => state.token)
  const user = useSessionStore((state) => state.user)
  const [testDialog, setTestDialog] = useState<TestDialogState>(null)
  const [testing, setTesting] = useState(false)
  const currentTab = ["email", "sms", "whatsapp", "paystack", "google", "meetings", "openai"].includes(tab) ? tab : "email"

  const emailQuery = useQuery({ queryKey: ["admin-settings-email"], queryFn: () => api.getAdminEmailSettings(token || ""), enabled: Boolean(token) && currentTab === "email" })
  const smsQuery = useQuery({ queryKey: ["admin-settings-sms"], queryFn: () => api.getAdminSmsSettings(token || ""), enabled: Boolean(token) && currentTab === "sms" })
  const whatsappQuery = useQuery({ queryKey: ["admin-settings-whatsapp"], queryFn: () => api.getAdminWhatsappSettings(token || ""), enabled: Boolean(token) && currentTab === "whatsapp" })
  const paystackQuery = useQuery({ queryKey: ["admin-settings-paystack"], queryFn: () => api.getAdminPaystackSettings(token || ""), enabled: Boolean(token) && currentTab === "paystack" })
  const googleQuery = useQuery({ queryKey: ["admin-settings-google"], queryFn: () => api.getAdminGoogleSettings(token || ""), enabled: Boolean(token) && currentTab === "google" })
  const meetingsQuery = useQuery({ queryKey: ["admin-settings-meetings"], queryFn: () => api.getAdminMeetingSettings(token || ""), enabled: Boolean(token) && currentTab === "meetings" })
  const openAIQuery = useQuery({ queryKey: ["admin-settings-openai"], queryFn: () => api.getAdminOpenAISettings(token || ""), enabled: Boolean(token) && currentTab === "openai" })
  const activeQuery = currentTab === "sms" ? smsQuery : currentTab === "whatsapp" ? whatsappQuery : currentTab === "paystack" ? paystackQuery : currentTab === "google" ? googleQuery : currentTab === "meetings" ? meetingsQuery : currentTab === "openai" ? openAIQuery : emailQuery

  const activeCard =
    currentTab === "sms"
      ? smsQuery.data && {
          title: "SMS Transport",
          description: "Manage sender identity, provider credentials, and SMS delivery readiness.",
          fields: [
            {
              name: "provider",
              label: "Provider",
              value: smsQuery.data.provider || "tiaraconnect",
              options: [{ label: "TiaraConnect", value: "tiaraconnect" }]
            },
            { name: "senderId", label: "Sender ID", value: smsQuery.data.senderId, placeholder: "CONNECT", required: true, minLength: 2, maxLength: 11, pattern: "[A-Za-z0-9]+", title: "Use 2-11 letters or numbers" },
            { name: "apiKey", label: "API Key", value: smsQuery.data.apiKey, type: "password", placeholder: "Paste TiaraConnect API key", required: true, minLength: 8, maxLength: 280 },
            { name: "baseUrl", label: "TiaraConnect API URL", value: smsQuery.data.baseUrl || "https://api2.tiaraconnect.io", placeholder: "https://api2.tiaraconnect.io", required: true, validateAs: "url", maxLength: 180 }
          ],
          onSave: async (values: Record<string, string>) => {
            await api.updateAdminSmsSettings(token || "", { provider: values.provider || "tiaraconnect", senderId: values.senderId, apiKey: values.apiKey, baseUrl: values.baseUrl })
            await smsQuery.refetch()
          },
          onTest: async () => {
            setTestDialog({
              channel: "sms",
              title: "Send SMS Test",
              description: "Send a short test SMS through the configured TiaraConnect sender.",
              label: "Recipient phone number",
              placeholder: "254799010210",
              defaultValue: ""
            })
          }
        }
      : currentTab === "whatsapp"
        ? whatsappQuery.data && {
            title: "Twilio WhatsApp Integration",
            description: "Manage Twilio WhatsApp credentials, sender identity, and inbound webhook routing.",
            fields: [
              { name: "provider", label: "Provider", value: whatsappQuery.data.provider, placeholder: "twilio", required: true, minLength: 2, maxLength: 40, pattern: "[a-z0-9_-]+", title: "Use lowercase letters, numbers, underscores, or hyphens" },
              { name: "accountSid", label: "Account SID", value: whatsappQuery.data.accountSid, placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", required: true, pattern: "AC[A-Za-z0-9]{32}", title: "Use a Twilio Account SID beginning with AC" },
              { name: "authToken", label: "Auth Token", value: whatsappQuery.data.authToken, type: "password", placeholder: "Paste provider auth token", required: true, minLength: 8, maxLength: 240 },
              { name: "fromNumber", label: "From Number", value: whatsappQuery.data.fromNumber, placeholder: "+254700000000", required: true, pattern: "\\+[1-9][0-9]{7,14}", title: "Use an E.164 phone number such as +254700000000" },
              { name: "webhookUrl", label: "Webhook URL", value: whatsappQuery.data.webhookUrl, placeholder: "https://api.tandaza.africa/webhooks/whatsapp", validateAs: "url", maxLength: 240 }
            ],
            onSave: async (values: Record<string, string>) => {
              await api.updateAdminWhatsappSettings(token || "", { provider: values.provider, accountSid: values.accountSid, authToken: values.authToken, fromNumber: values.fromNumber, webhookUrl: values.webhookUrl })
              await whatsappQuery.refetch()
            },
            onTest: async () => {
              setTestDialog({
                channel: "whatsapp",
                title: "Send WhatsApp Test",
                description: "Send a WhatsApp test message to confirm the configured provider credentials.",
                label: "Recipient WhatsApp number",
                placeholder: "+254799010210",
                defaultValue: ""
              })
            }
          }
      : currentTab === "paystack"
        ? paystackQuery.data && {
            title: "Paystack Integration",
            description: "Manage payment keys, callbacks, and the processing fee added to card checkout totals.",
            fields: [
              { name: "publicKey", label: "Public Key", value: paystackQuery.data.publicKey, placeholder: "pk_live_xxxxxxxxxxxxxxxx", required: true, pattern: "pk_(test|live)_[A-Za-z0-9]+", title: "Use a Paystack public key beginning with pk_test_ or pk_live_" },
              { name: "secretKey", label: "Secret Key", value: paystackQuery.data.secretKey, type: "password", placeholder: "sk_live_xxxxxxxxxxxxxxxx", required: true, pattern: "sk_(test|live)_[A-Za-z0-9]+", title: "Use a Paystack secret key beginning with sk_test_ or sk_live_" },
              { name: "callbackUrl", label: "Callback URL", value: paystackQuery.data.callbackUrl, placeholder: "https://app.tandaza.africa/payments/callback", validateAs: "url", maxLength: 240 },
              { name: "processingFeePercent", label: "Processing Fee %", value: String(((paystackQuery.data.processingFeeBps || 0) / 100).toFixed(2)), type: "number", placeholder: "0.10", min: 0, max: 99.99 }
            ],
            onSave: async (values: Record<string, string>) => {
              const processingFeePercent = Number(values.processingFeePercent || 0)
              if (!Number.isFinite(processingFeePercent) || processingFeePercent < 0 || processingFeePercent >= 100) {
                toast.error("Check processing fee", { description: "Processing fee must be between 0 and 99.99 percent." })
                return
              }
              await api.updateAdminPaystackSettings(token || "", {
                publicKey: values.publicKey,
                secretKey: values.secretKey,
                callbackUrl: values.callbackUrl,
                processingFeeBps: Math.round(processingFeePercent * 100)
              })
              await paystackQuery.refetch()
            }
          }
        : currentTab === "openai"
          ? openAIQuery.data && {
              title: "OpenAI Analytics",
              description: "Configure the OpenAI key used for on-demand AI performance summaries across reports and analytics.",
              fields: [
                {
                  name: "enabled",
                  label: "Status",
                  value: openAIQuery.data.enabled ? "enabled" : "disabled",
                  options: [
                    { label: "Enabled", value: "enabled" },
                    { label: "Disabled", value: "disabled" }
                  ]
                },
                { name: "model", label: "Model", value: openAIQuery.data.model || "gpt-4.1-mini", placeholder: "gpt-4.1-mini", required: true, minLength: 3, maxLength: 80 },
                { name: "apiKey", label: "API Key", value: openAIQuery.data.apiKey, type: "password", placeholder: "sk-...", required: false, minLength: 8, maxLength: 260 }
              ],
              onSave: async (values: Record<string, string>) => {
                await api.updateAdminOpenAISettings(token || "", { enabled: values.enabled === "enabled", model: values.model || "gpt-4.1-mini", apiKey: values.apiKey })
                await openAIQuery.refetch()
              },
              onTest: async () => {
                try {
                  await api.testAdminOpenAISettings(token || "")
                  toast.success("OpenAI test passed", { description: "The configured key can generate structured analytics output." })
                } catch (error) {
                  toast.error("OpenAI test failed", { description: error instanceof Error ? error.message : "Check the API key and model." })
                }
              }
            }
        : currentTab === "google"
          ? googleQuery.data && {
              title: "Google Services",
              description: "Manage Google sign-in and the calendar configuration used for Meet-backed expo meetings.",
              fields: [
                { name: "clientId", label: "Client ID", value: googleQuery.data.clientId, placeholder: "xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com", required: true, minLength: 20, maxLength: 240 },
                { name: "calendarIntegrationEnabled", label: "Calendar Integration", value: googleQuery.data.calendarIntegrationEnabled ? "enabled" : "disabled", options: [{ label: "Enabled", value: "enabled" }, { label: "Disabled", value: "disabled" }] },
                { name: "calendarId", label: "Calendar ID", value: googleQuery.data.calendarId || "", placeholder: "primary or meetings@tandaza.africa", maxLength: 180 },
                { name: "serviceAccountEmail", label: "Service Account Email", value: googleQuery.data.serviceAccountEmail || "", placeholder: "calendar-bot@project.iam.gserviceaccount.com", maxLength: 220 },
                { name: "serviceAccountKey", label: "Service Account Key", value: googleQuery.data.serviceAccountKey || "", type: "password", placeholder: "Paste private key JSON or PEM", maxLength: 6000 }
              ],
              onSave: async (values: Record<string, string>) => {
                await api.updateAdminGoogleSettings(token || "", {
                  clientId: values.clientId,
                  calendarIntegrationEnabled: values.calendarIntegrationEnabled === "enabled",
                  calendarId: values.calendarId,
                  serviceAccountEmail: values.serviceAccountEmail,
                  serviceAccountKey: values.serviceAccountKey
                })
                await googleQuery.refetch()
              }
            }
        : currentTab === "meetings"
          ? meetingsQuery.data && {
              title: "Meeting Categories",
              description: "Manage the category types exhibitors choose when scheduling visitor meetings.",
              fields: [
                { name: "categoryTypes", label: "Category Types", value: (meetingsQuery.data.categoryTypes || []).join("\n"), placeholder: "Online demo\nSales consultation\nProduct walkthrough", required: true, multiline: true, minLength: 4, maxLength: 2000 }
              ],
              onSave: async (values: Record<string, string>) => {
                await api.updateAdminMeetingSettings(token || "", { categoryTypes: values.categoryTypes.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean) })
                await meetingsQuery.refetch()
              }
            }
        : emailQuery.data && {
            title: "Email Transport",
            description: "Manage sender identity and SMTP transport settings for outbound email delivery.",
            fields: [
              { name: "senderName", label: "Sender Name", value: emailQuery.data.senderName, placeholder: "Tandaza", required: true, minLength: 2, maxLength: 80 },
              { name: "senderEmail", label: "Sender Email", value: emailQuery.data.senderEmail, placeholder: "notifications@tandaza.africa", required: true, validateAs: "email", maxLength: 160 },
              { name: "smtpHost", label: "SMTP Host", value: emailQuery.data.smtpHost, placeholder: "smtp.example.com", required: true, minLength: 3, maxLength: 160 },
              { name: "smtpPort", label: "SMTP Port", value: emailQuery.data.smtpPort, placeholder: "587", required: true, type: "number", min: 1, max: 65535, validateAs: "port" },
              { name: "username", label: "Username", value: emailQuery.data.username, placeholder: "smtp-user@example.com", required: true, maxLength: 160 },
              { name: "password", label: "Password", value: emailQuery.data.password, type: "password", placeholder: "SMTP password", required: true, minLength: 4, maxLength: 240 },
              {
                name: "encryption",
                label: "Encryption",
                value: emailQuery.data.encryption || "starttls",
                options: [
                  { label: "STARTTLS", value: "starttls" },
                  { label: "SSL/TLS", value: "ssl" },
                  { label: "None", value: "none" }
                ]
              }
            ],
            onSave: async (values: Record<string, string>) => {
              await api.updateAdminEmailSettings(token || "", { senderName: values.senderName, senderEmail: values.senderEmail, smtpHost: values.smtpHost, smtpPort: Number(values.smtpPort || 587), username: values.username, password: values.password, encryption: values.encryption })
              await emailQuery.refetch()
            },
            onTest: async () => {
              setTestDialog({
                channel: "email",
                title: "Send Email Test",
                description: "Send a polished Tandaza test email through the configured SMTP account.",
                label: "Recipient email address",
                placeholder: "name@example.com",
                defaultValue: user?.email || emailQuery.data.senderEmail
              })
            }
          }

  if (activeQuery.isLoading || activeQuery.isFetching || !token) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  if (activeQuery.isError) {
    return (
      <ErrorState
        title="Settings could not be loaded"
        message="Refresh the settings from the server and try again."
        onRetry={() => activeQuery.refetch()}
      />
    )
  }

  if (!activeCard) {
    return (
      <ErrorState
        title="Settings are unavailable"
        message="This settings section is not ready yet."
        onRetry={() => activeQuery.refetch()}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Global Settings" description="Manage platform-wide email, SMS, WhatsApp, Paystack, Google, meeting categories, and OpenAI analytics configuration. Categories and countries live in their own Global Platform pages." />
      <SettingsTabs currentTab={currentTab} />
      <SettingsFormCard
        title={activeCard.title}
        description={activeCard.description}
        fields={activeCard.fields}
        onTest={activeCard.onTest}
        onSave={async (values) => {
          try {
            await activeCard.onSave(values)
            toast.success("Configuration saved")
          } catch (error) {
            toast.error("Could not save configuration", { description: error instanceof Error ? error.message : "Check the settings and try again." })
          }
        }}
      />
      <TestRecipientDialog
        state={testDialog}
        testing={testing}
        onClose={() => setTestDialog(null)}
        onSubmit={async (state, value) => {
          setTesting(true)
          try {
            const recipient = state.channel === "email" ? { email: value } : { phone: value }
            const result = await api.testAdminNotification(token || "", testNotificationPayload(state.channel, recipient))
            if (result.status !== "sent" && result.status !== "delivered") {
              throw new Error(`Provider test returned ${result.status}. Check notification attempts for the provider response.`)
            }
            toast.success("Test sent", { description: "A test notification was queued and delivery was attempted." })
            setTestDialog(null)
          } catch (error) {
            toast.error("Test failed", { description: error instanceof Error ? error.message : "Check the configuration and recipient." })
          } finally {
            setTesting(false)
          }
        }}
      />
    </div>
  )
}

function testNotificationPayload(channel: "email" | "sms" | "whatsapp", recipient: { email?: string; phone?: string }) {
  return {
    channel,
    role: "administrator" as const,
    templateKey: "admin_test_send",
    payload: {
      ...recipient,
      subject: "Tandaza test notification",
      title: "Tandaza test notification",
      message: "Your Tandaza notification configuration is working.",
      ctaLabel: "Open Tandaza",
      ctaUrl: "https://demo.tandaza.africa/administrator/settings"
    }
  }
}

function TestRecipientDialog({
  state,
  testing,
  onClose,
  onSubmit
}: {
  state: TestDialogState
  testing: boolean
  onClose: () => void
  onSubmit: (state: NonNullable<TestDialogState>, value: string) => Promise<void>
}) {
  const [value, setValue] = useState("")

  useEffect(() => {
    setValue(state?.defaultValue || "")
  }, [state])

  if (!state) return null
  const dialogState = state

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleaned = value.trim()
    if (dialogState.channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      toast.error("Check email address", { description: "Enter a valid test recipient email address." })
      return
    }
    if (dialogState.channel !== "email" && !/^\+?[1-9][0-9]{7,14}$/.test(cleaned)) {
      toast.error("Check phone number", { description: "Use international format, for example +254799010210." })
      return
    }
    void onSubmit(dialogState, cleaned)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="settings-test-title" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border/80 bg-card shadow-shell"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border/70 bg-elevated/70 px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary/80">Provider Test</p>
          <h2 id="settings-test-title" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{dialogState.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{dialogState.description}</p>
        </div>
        <div className="space-y-3 px-6 py-6">
          <label htmlFor="settings-test-recipient" className="text-sm font-semibold text-foreground">{dialogState.label}</label>
          <Input
            id="settings-test-recipient"
            type={dialogState.channel === "email" ? "email" : "tel"}
            inputMode={dialogState.channel === "email" ? "email" : "tel"}
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={dialogState.placeholder}
          />
          <p className="text-xs leading-5 text-slate-500">
            {dialogState.channel === "email" ? "The test email will be stored in notifications with its delivery attempt." : dialogState.channel === "sms" ? "You can enter 254799010210 or +254799010210. TiaraConnect receives it without the plus sign." : "Use international format so the provider can route the message correctly."}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-border/70 bg-background/70 px-6 py-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={testing} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={testing}>{testing ? "Sending..." : "Send test"}</Button>
        </div>
      </form>
    </div>
  )
}
