import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AMI Colony — Observatoire',
  description: 'Expérience d\'intelligence émergente — observatoire public',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
