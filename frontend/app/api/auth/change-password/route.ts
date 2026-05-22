import { NextResponse } from "next/server"
import { changePasswordWithGo, currentUserFromGo } from "@/lib/auth/server-api"
import { getSessionToken } from "@/lib/auth/session-cookie"

export async function POST(request: Request) {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ message: "Sign in before changing your password." }, { status: 401 })
  }

  try {
    const payload = await request.json()
    const result = await changePasswordWithGo(token, payload)
    const session = await currentUserFromGo(token)
    return NextResponse.json({ ...result, user: session.user })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Password change failed." }, { status: 400 })
  }
}
