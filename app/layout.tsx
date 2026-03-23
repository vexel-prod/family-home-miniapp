import type { Metadata } from 'next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'Household',
  description: 'Telegram Mini App для семейных задач по дому и общего списка покупок',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isProduction = process.env.NODE_ENV === 'production'

  return (
    <html
      lang='ru'
      data-theme='night'
      suppressHydrationWarning
    >
      <body>
        {isProduction ? (
          <Script
            src='https://telegram.org/js/telegram-web-app.js'
            strategy='beforeInteractive'
          />
        ) : null}
        {children}
        {isProduction ? <SpeedInsights /> : null}
        {isProduction ? <Analytics /> : null}
      </body>
    </html>
  )
}
