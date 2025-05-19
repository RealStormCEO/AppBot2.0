'use client'

import { SessionProvider } from 'next-auth/react'
import '@/styles/global.css'
import Topbar from '@/components/Topbar'

export default function NoNavLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <Topbar />
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
