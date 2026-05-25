import type { Metadata, Viewport } from "next"
import Script from "next/script"
import "./globals.css"
import "intro.js/introjs.css"
import { Providers } from "./providers"

const googleAnalyticsId = "G-3VXHJX0W4B"
const vexoScriptUrl = "https://www.vexo.co/analytics.js"

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
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} strategy="afterInteractive" />
        <Script src={vexoScriptUrl} strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${googleAnalyticsId}');
          `}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
