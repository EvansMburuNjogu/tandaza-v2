import { NextResponse } from "next/server"
import { forgotPasswordWithGo } from "@/lib/auth/server-api"

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const response = await forgotPasswordWithGo(payload)
    return NextResponse.json({ message: response.message })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Could not start password reset." }, { status: 400 })
  }
}
