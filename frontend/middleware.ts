import { NextRequest, NextResponse } from "next/server"

const hiddenDemoFiles = new Set(["/robots.txt", "/sitemap.xml"])

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase() || ""
  if (host === "demo.tandaza.africa" && hiddenDemoFiles.has(request.nextUrl.pathname)) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/robots.txt", "/sitemap.xml"],
}
