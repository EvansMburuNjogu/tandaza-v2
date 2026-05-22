import { NextResponse } from "next/server"
import { currentUserFromGo } from "@/lib/auth/server-api"
import { clearSessionToken, getSessionToken } from "@/lib/auth/session-cookie"

export async function GET() {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ user: null })
  }

  try {
    const response = await currentUserFromGo(token)
    return NextResponse.json({ user: response.user })
  } catch {
    await clearSessionToken()
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
