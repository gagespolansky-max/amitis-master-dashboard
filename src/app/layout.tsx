import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Sidebar from "@/components/sidebar"
import SidebarLayout from "@/components/sidebar-layout"
import MainContent from "@/components/main-content"
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
        <SidebarLayout>
          <Sidebar />
          <MainContent>{children}</MainContent>
        </SidebarLayout>
        <DoodlePad />
      </body>
    </html>
  )
}
