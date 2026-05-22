import { NextResponse } from "next/server"
import { verifyEmailWithGo } from "@/lib/auth/server-api"
import { setSessionToken } from "@/lib/auth/session-cookie"

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const response = await verifyEmailWithGo(payload)
    await setSessionToken(response.token)
    return NextResponse.json({ user: response.user, redirectTo: response.redirectTo })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Email verification failed." }, { status: 400 })
  }
}
