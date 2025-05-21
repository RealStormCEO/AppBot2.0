'use client'

import { SessionProvider } from 'next-auth/react'
import Topbar from '@/components/Topbar'
import DevSidebar from '@/components/DevSidebar'
import styles from './DeveloperLayout.module.css'

export default function DeveloperLayout({ children }) {
  return (
    <SessionProvider>
      <Topbar />
      <div className={styles.container}>
        <DevSidebar />
        <main className={styles.content}>{children}</main>
      </div>
    </SessionProvider>
  )
}
