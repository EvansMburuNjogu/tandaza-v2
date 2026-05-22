import type { Metadata } from "next"
import "./globals.css"
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
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: "/favicon.svg",
  },
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
