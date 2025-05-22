// app/(with-nav)/layout.jsx
'use client'

import { SessionProvider } from 'next-auth/react'
import '@/styles/global.css'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function WithNavLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <ProtectedRoute>
            {children}
          </ProtectedRoute>
        </SessionProvider>
      </body>
    </html>
  )
}
