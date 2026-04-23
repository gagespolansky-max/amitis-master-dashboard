import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Sidebar from "@/components/sidebar"
import SidebarLayout from "@/components/sidebar-layout"
import MainContent from "@/components/main-content"
import DoodlePad from "@/components/doodle-pad"
import { getUserWithRole } from "@/lib/auth"

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

// Layout reads the user's role per request; never cache the rendered HTML.
export const dynamic = "force-dynamic"

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { user, role } = await getUserWithRole()

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full">
        {user ? (
          <>
            <SidebarLayout>
              <Sidebar role={role ?? "teammate"} email={user.email ?? ""} />
              <MainContent>{children}</MainContent>
            </SidebarLayout>
            <DoodlePad />
          </>
        ) : (
          children
        )}
      </body>
    </html>
  )
}
