import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

function allowedHosts(request: NextRequest) {
  const hosts = new Set<string>()
  const requestHost = request.headers.get("x-forwarded-host") || request.headers.get("host")
  if (requestHost) hosts.add(requestHost)
  const configuredUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL
  if (configuredUrl) {
    try {
      hosts.add(new URL(configuredUrl).host)
    } catch {
      // Ignore malformed optional config.
    }
  }
  return hosts
}

export async function POST(request: NextRequest) {
  let target: URL
  try {
    const body = await request.json()
    target = new URL(String(body.url || ""))
  } catch {
    return NextResponse.json({ error: "invalid_url", message: "Provide a valid URL." }, { status: 400 })
  }

  if (!["http:", "https:"].includes(target.protocol) || !target.pathname.startsWith("/q/")) {
    return NextResponse.json({ error: "invalid_url", message: "Only Tandaza QR links can be shortened." }, { status: 400 })
  }

  if (!allowedHosts(request).has(target.host)) {
    return NextResponse.json({ error: "invalid_url", message: "Only this Tandaza domain can be shortened." }, { status: 400 })
  }

  return NextResponse.json({ url: target.toString(), provider: "tandaza" })
}
