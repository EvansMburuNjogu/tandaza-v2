import { NextResponse } from "next/server"
import { registerWithGo } from "@/lib/auth/server-api"

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    if (payload.role !== "visitor") {
      return NextResponse.json({ message: "Only visitors can self-register." }, { status: 400 })
    }
    const response = await registerWithGo(payload)
    return NextResponse.json({ message: response.message, user: response.user }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Registration failed." }, { status: 400 })
  }
}
