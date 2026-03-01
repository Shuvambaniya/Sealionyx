import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sealionyx - Cryptographic Authenticity Platform',
  description: 'Secure AI-generated content with PKI, digital signatures, and hybrid encryption',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}
