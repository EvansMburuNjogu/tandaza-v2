import { NextRequest, NextResponse } from "next/server"
import { getSessionToken } from "@/lib/auth/session-cookie"

const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

type RouteContext = {
  params: Promise<{ path: string[] }>
}

async function proxy(request: NextRequest, context: RouteContext) {
  const token = await getSessionToken()
  const { path } = await context.params
  const targetPath = `/${path.join("/")}${request.nextUrl.search}`
  const method = request.method
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer()
  const contentType = request.headers.get("Content-Type")
  const headers: Record<string, string> = {}
  if (contentType) headers["Content-Type"] = contentType
  headers["X-Forwarded-Proto"] = "https"
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const response = await fetch(`${apiBaseUrl}${targetPath}`, {
    method,
    headers,
    body,
    cache: "no-store"
  })
  const payload = await response.arrayBuffer()
  const responseHeaders: Record<string, string> = {
    "Content-Type": response.headers.get("Content-Type") || "application/json"
  }
  const disposition = response.headers.get("Content-Disposition")
  if (disposition) responseHeaders["Content-Disposition"] = disposition
  return new NextResponse(payload, {
    status: response.status,
    headers: responseHeaders
  })
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context)
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, context)
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, context)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, context)
}
