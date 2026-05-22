import { NextResponse } from "next/server"
import { googleConfigFromGo } from "@/lib/auth/server-api"

export async function GET() {
  try {
    return NextResponse.json(await googleConfigFromGo())
  } catch {
    return NextResponse.json({ clientId: "", enabled: false })
  }
}
