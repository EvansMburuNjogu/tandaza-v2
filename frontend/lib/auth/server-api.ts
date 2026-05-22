import { AuthResponse, Role, SessionResponse } from "@/lib/api/contracts"

const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

type ErrorPayload = {
  error?: string
  message?: string
}

export async function goRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-Proto": "https",
      ...(init?.headers || {})
    },
    cache: "no-store"
  })

  if (!response.ok) {
    let message = "Request failed. Please try again."
    try {
      const payload = (await response.json()) as ErrorPayload
      message = payload.message || payload.error || message
    } catch {
      message = await response.text()
    }
    throw new Error(message)
  }

  return sanitizeProtectedPII(await response.json()) as T
}

export function basicAuth(email: string, password: string) {
  return `Basic ${Buffer.from(`${email}:${password}`).toString("base64")}`
}

function sanitizeProtectedPII(value: unknown): unknown {
  if (typeof value === "string") {
    return /^pii:[a-f0-9]+$/i.test(value.trim()) ? "" : value
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeProtectedPII(item))
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeProtectedPII(item)]))
  }
  return value
}

export type RegisterPayload = {
  name: string
  email: string
  password: string
  role: Extract<Role, "visitor">
  companyName?: string
  countryCode?: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type ForgotPasswordPayload = {
  email: string
}

export type ResetPasswordPayload = {
  token: string
  newPassword: string
}

export type ChangePasswordPayload = {
  currentPassword: string
  newPassword: string
  confirmPassword?: string
}

export type VerifyEmailPayload = {
  token: string
}

export type GooglePayload = {
  idToken: string
}

export async function loginWithGo(payload: LoginPayload) {
  return goRequest<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    headers: { Authorization: basicAuth(payload.email, payload.password) }
  })
}

export async function registerWithGo(payload: RegisterPayload) {
  return goRequest<{ message: string; user?: AuthResponse["user"]; verificationLink?: string }>("/api/v1/auth/register", {
    method: "POST",
    headers: { Authorization: basicAuth(payload.email, payload.password) },
    body: JSON.stringify({
      name: payload.name,
      role: payload.role,
      companyName: payload.companyName || "",
      countryCode: payload.countryCode || "KE"
    })
  })
}

export async function currentUserFromGo(token: string) {
  return goRequest<SessionResponse>("/api/v1/auth/me", {
    headers: { Authorization: `Bearer ${token}` }
  })
}

export async function forgotPasswordWithGo(payload: ForgotPasswordPayload) {
  return goRequest<{ message: string; token?: string }>("/api/v1/auth/forgot-password", {
    method: "POST",
    headers: { Authorization: basicAuth(payload.email, "forgot-password") }
  })
}

export async function resetPasswordWithGo(payload: ResetPasswordPayload) {
  return goRequest<{ success: boolean }>("/api/v1/auth/reset-password", {
    method: "POST",
    headers: { Authorization: basicAuth(payload.token, payload.newPassword) }
  })
}

export async function changePasswordWithGo(token: string, payload: ChangePasswordPayload) {
  return goRequest<{ success: boolean }>("/api/v1/auth/change-password", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  })
}

export async function verifyEmailWithGo(payload: VerifyEmailPayload) {
  return goRequest<AuthResponse>("/api/v1/auth/verify-email", {
    method: "POST",
    headers: { Authorization: basicAuth(payload.token, "verify-email") }
  })
}

export async function googleWithGo(payload: GooglePayload) {
  return goRequest<AuthResponse>("/api/v1/auth/google", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}

export async function googleConfigFromGo() {
  return goRequest<{ clientId: string; enabled: boolean }>("/api/v1/auth/google/config")
}
