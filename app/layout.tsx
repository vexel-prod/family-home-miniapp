import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'Family Home Mini App',
  description: 'Telegram Mini App для семейных задач по дому и общего списка покупок',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang='ru'
      data-theme='night'
      suppressHydrationWarning
    >
      <body>
        <Script
          src='https://telegram.org/js/telegram-web-app.js'
          strategy='beforeInteractive'
        />
        {children}
      </body>
    </html>
  )
}
