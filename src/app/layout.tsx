import type { Metadata } from 'next'
import { Instrument_Sans } from 'next/font/google'
import { GeistMono } from 'geist/font/mono'
import { Toaster } from 'sonner'
import './globals.css'

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ui',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ManIAcos Hub',
  description: 'Hub interno de coordinación — ManIAcos',
  // No index — internal tool
  robots: { index: false, follow: false },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // dark class hardcoded — Hub is dark-native only, never toggled
    <html lang="es" className="dark">
      <body className={`${instrumentSans.variable} ${GeistMono.variable} antialiased`}>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              color: 'var(--t1)',
              fontFamily: 'var(--ui)',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  )
}
