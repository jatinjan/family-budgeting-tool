import type React from "react"
import type { Metadata, Viewport } from "next"
import { Nunito, Inter } from "next/font/google"
import "./globals.css"
import { BottomNav } from "@/components/bottom-nav"
import { Providers } from "@/components/providers"
import { APP_CONFIG } from "@/lib/config"

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" })
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: APP_CONFIG.APP_NAME,
  description: APP_CONFIG.APP_TAGLINE,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_CONFIG.APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
    generator: 'v0.app'
}

export const viewport: Viewport = {
  themeColor: "#5A9E9E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${nunito.variable} ${inter.variable} font-sans antialiased`}>
        <Providers>
          <div 
            className="min-h-screen pb-20"
            style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            {children}
          </div>
          <BottomNav />
        </Providers>
      </body>
    </html>
  )
}
