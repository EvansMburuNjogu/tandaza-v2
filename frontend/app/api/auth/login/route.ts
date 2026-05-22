import { NextResponse } from "next/server"
import { loginWithGo } from "@/lib/auth/server-api"
import { setSessionToken } from "@/lib/auth/session-cookie"

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const response = await loginWithGo(payload)
    await setSessionToken(response.token)
    return NextResponse.json({ user: response.user, redirectTo: response.redirectTo })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Login failed." }, { status: 401 })
  }
}
