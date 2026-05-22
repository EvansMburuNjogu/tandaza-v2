import { NextResponse } from "next/server"
import { resetPasswordWithGo } from "@/lib/auth/server-api"

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const response = await resetPasswordWithGo(payload)
    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Could not reset password." }, { status: 400 })
  }
}
