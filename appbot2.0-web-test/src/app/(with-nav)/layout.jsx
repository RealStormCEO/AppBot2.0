// src/app/(with-nav)/layout.jsx
'use client'

import { SessionProvider } from 'next-auth/react'
import '@/styles/global.css'

export default function WithNavLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children} {/* No <Navbar /> here */}
        </SessionProvider>
      </body>
    </html>
  )
}
