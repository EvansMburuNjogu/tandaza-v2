"use client"

import { callingCodeOptions } from "@/lib/calling-codes"

type VisitorPhoneInputProps = {
  id: string
  label?: string
  callingCode: string
  phone: string
  onCallingCodeChange: (value: string) => void
  onPhoneChange: (value: string) => void
}

export function fullPhoneNumber(callingCode: string, phone: string) {
  const local = phone.replace(/[^\d]/g, "")
  return local ? `${callingCode}${local}` : ""
}

export function VisitorPhoneInput({
  id,
  label = "Phone number",
  callingCode,
  phone,
  onCallingCodeChange,
  onPhoneChange
}: VisitorPhoneInputProps) {
  return (
    <div>
      <label className="text-sm font-semibold text-foreground" htmlFor={id}>{label}</label>
      <div className="mt-2 grid min-w-0 grid-cols-[minmax(6.75rem,8rem)_minmax(0,1fr)] gap-2">
        <select
          value={callingCode}
          onChange={(event) => onCallingCodeChange(event.target.value)}
          className="h-12 min-w-0 rounded-xl border border-border bg-elevated px-3 text-sm text-foreground outline-none focus:border-primary"
          aria-label="Country calling code"
        >
          {callingCodeOptions.map((option) => (
            <option key={`${option.iso}-${option.code}`} value={option.code}>
              {option.iso} {option.code}
            </option>
          ))}
        </select>
        <input
          id={id}
          value={phone}
          inputMode="tel"
          onChange={(event) => onPhoneChange(event.target.value)}
          placeholder="799010210"
          className="h-12 min-w-0 rounded-xl border border-border bg-elevated px-3 text-sm text-foreground outline-none placeholder:text-slate-400 focus:border-primary"
        />
      </div>
    </div>
  )
}
