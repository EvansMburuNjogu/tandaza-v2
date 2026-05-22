import { Role, User } from "@/lib/api/contracts"

type AuthSessionResponse = {
  user: User
  redirectTo: string
}

type RegistrationResponse = {
  message: string
  user?: User
}

type AuthError = {
  message?: string
}

async function authRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  })

  if (!response.ok) {
    let message = "Something went wrong. Please try again."
    try {
      const payload = (await response.json()) as AuthError
      message = payload.message || message
    } catch {
      message = await response.text()
    }
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export function login(payload: { email: string; password: string }) {
  return authRequest<AuthSessionResponse>("/api/auth/login", payload)
}

export function register(payload: {
  name: string
  email: string
  password: string
  role: Extract<Role, "visitor">
  companyName?: string
  countryCode?: string
}) {
  return authRequest<RegistrationResponse>("/api/auth/register", payload)
}

export function forgotPassword(payload: { email: string }) {
  return authRequest<{ message: string; token?: string }>("/api/auth/forgot-password", payload)
}

export function resetPassword(payload: { token: string; newPassword: string }) {
  return authRequest<{ success: boolean }>("/api/auth/reset-password", payload)
}

export function changePassword(payload: { currentPassword: string; newPassword: string; confirmPassword: string }) {
  return authRequest<{ success: boolean; user?: User }>("/api/auth/change-password", payload)
}

export function verifyEmail(payload: { token: string }) {
  return authRequest<AuthSessionResponse>("/api/auth/verify-email", payload)
}

export function googleAuth(payload: { idToken: string }) {
  return authRequest<AuthSessionResponse>("/api/auth/google", payload)
}

export function logout() {
  return authRequest<{ success: boolean }>("/api/auth/logout")
}
