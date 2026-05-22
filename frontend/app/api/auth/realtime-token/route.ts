import { NextResponse } from "next/server"
import { getSessionToken } from "@/lib/auth/session-cookie"

export async function GET() {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 })
  }
  return NextResponse.json({ token })
}
