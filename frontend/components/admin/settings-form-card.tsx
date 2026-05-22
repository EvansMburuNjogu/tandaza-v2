"use client"

import { FormEvent, useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/admin/status-badge"
import { validateUrlValue } from "@/lib/admin-validation"
import { toast } from "sonner"

type SettingsField = {
  name: string
  label: string
  value: string | number
  type?: string
  placeholder?: string
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  title?: string
  validateAs?: string
  multiline?: boolean
  options?: Array<{ label: string; value: string }>
}

export function SettingsFormCard({
  title,
  description,
  status,
  fields,
  onSave,
  onTest
}: {
  title: string
  description: string
  status?: string
  fields: SettingsField[]
  onSave: (values: Record<string, string>) => Promise<void>
  onTest?: (values: Record<string, string>) => Promise<void>
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    setValues(Object.fromEntries(fields.map((field) => [field.name, String(field.value ?? "")])))
  }, [fields])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    for (const field of fields) {
      const value = values[field.name] ?? ""
      if (field.required && !value.trim()) {
        toast.error(`Check ${field.label}`, { description: `${field.label} is required.` })
        return
      }
      if (field.validateAs === "url" && !validateUrlValue(field.label, value)) return
      if (field.validateAs === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        toast.error(`Check ${field.label}`, { description: "Enter a valid email address." })
        return
      }
      if (field.validateAs === "port") {
        const port = Number(value)
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          toast.error(`Check ${field.label}`, { description: "Port must be a whole number between 1 and 65535." })
          return
        }
      }
    }
    setSaving(true)
    try {
      await onSave(values)
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (!onTest) return
    setTesting(true)
    try {
      await onTest(values)
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card className="border-border/80 bg-card/95 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Configuration</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {status ? <StatusBadge value={status} /> : null}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2 rounded-2xl border border-border/70 bg-elevated/65 p-4 shadow-sm">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">{field.label}</label>
              {field.options ? (
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={values[field.name] ?? ""}
                  onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.multiline ? (
                <textarea
                  placeholder={field.placeholder}
                  required={field.required}
                  minLength={field.minLength}
                  maxLength={field.maxLength}
                  value={values[field.name] ?? ""}
                  onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                  className="min-h-32 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm text-foreground outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              ) : (
                <Input
                  type={field.type || "text"}
                  placeholder={field.placeholder}
                  required={field.required}
                  min={field.min}
                  max={field.max}
                  minLength={field.minLength}
                  maxLength={field.maxLength}
                  pattern={field.pattern}
                  title={field.title}
                  value={values[field.name] ?? ""}
                  onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button disabled={saving}>{saving ? "Saving..." : "Save configuration"}</Button>
          {onTest ? (
            <Button type="button" variant="secondary" disabled={saving || testing} onClick={handleTest}>
              {testing ? "Testing..." : "Test connection"}
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  )
}
