import type { Metadata } from 'next'
import { Geist_Mono, Manrope, Syne } from 'next/font/google'
import Providers from '@/components/Providers'
import './globals.css'

const display = Syne({
  variable: '--font-display',
  subsets: ['latin'],
})

const body = Manrope({
  variable: '--font-body',
  subsets: ['latin', 'cyrillic'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'OmniVoice AI',
  description:
    'Realtime translation call suite with Bulgarian + global languages, AI secretary, rooms, and streaming — far beyond chat apps.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="bg"
      translate="no"
      data-theme="dark"
      className={`${display.variable} ${body.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
