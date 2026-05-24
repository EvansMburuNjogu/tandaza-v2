import type { Metadata, Viewport } from "next"
import "./globals.css"
import "intro.js/introjs.css"
import { Providers } from "./providers"

export const metadata: Metadata = {
  title: {
    default: "Tandaza — Africa's Expo Digital Platform",
    template: "%s | Tandaza",
  },
  description:
    "Tandaza connects organizers, exhibitors, sponsors, and visitors in a single platform. End-to-end expo lifecycle management built for African markets.",
  metadataBase: new URL("https://tandaza.com"),
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
