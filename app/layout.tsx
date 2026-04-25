import type { Metadata } from "next"
import { Noto_Serif_SC, Noto_Sans_SC } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const notoSerif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-noto-serif",
})

const notoSans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-noto-sans",
})

export const metadata: Metadata = {
  title: "釉见陶瓷 · 器以载道",
  description: "东方极简陶瓷艺术 — 茶器 花器 香炉 艺术品",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className={`${notoSerif.variable} ${notoSans.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
