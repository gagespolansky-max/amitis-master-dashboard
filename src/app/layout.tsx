import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Sidebar from "@/components/sidebar"
import DoodlePad from "@/components/doodle-pad"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Master Dashboard",
  description: "Central hub for all workflows and initiatives",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full">
        <Sidebar />
        <main className="ml-[var(--sidebar-width)] min-h-screen">
          <div className="px-8 py-8 max-w-7xl">
            {children}
          </div>
        </main>
        <DoodlePad />
      </body>
    </html>
  )
}
