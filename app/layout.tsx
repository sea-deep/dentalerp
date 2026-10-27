import type { Metadata, Viewport } from 'next'
import './globals.css'
import './fonts.css'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: {
    default: 'DentalERP — Dental Practice Management System',
    template: '%s | DentalERP',
  },
  description:
    'Open-source dental practice management for clinics and multi-branch hospitals. Electronic dental records, interactive odontograms, treatment planning, scheduling, GST billing and a patient portal.',
  keywords: [
    'dental software',
    'dental clinic management software',
    'dental practice management',
    'open source dental software',
    'electronic dental records',
    'odontogram',
    'dental billing GST',
    'dental clinic software India',
    'appointment scheduling dental',
    'dental clinical workflow',
  ],
  manifest: '/manifest.json',
  applicationName: 'DentalERP',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    title: 'DentalERP — Dental Practice Management System',
    description:
      'Open-source dental practice management with interactive odontograms, clinical documentation, treatment planning, and GST billing.',
    siteName: 'DentalERP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DentalERP — Dental Practice Management System',
    description:
      'Open-source dental practice management with interactive odontograms, clinical documentation, and GST billing.',
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DentalERP',
  },
}

export const viewport: Viewport = {
  themeColor: '#0E7490',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-clinic">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
