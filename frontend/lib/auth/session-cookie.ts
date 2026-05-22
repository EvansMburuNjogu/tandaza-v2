import { cookies } from "next/headers"

export const sessionCookieName = "tandaza_session"

export async function getSessionToken() {
  return (await cookies()).get(sessionCookieName)?.value || ""
}

export async function setSessionToken(token: string) {
  ;(await cookies()).set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  })
}

export async function clearSessionToken() {
  ;(await cookies()).set(sessionCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  })
}
