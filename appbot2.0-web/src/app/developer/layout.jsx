'use client'

import { SessionProvider, useSession } from 'next-auth/react'
import DevSidebar from '@/components/DevSidebar'
import styles from './DeveloperLayout.module.css'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const Topbar = dynamic(() => import('@/components/Topbar'), { ssr: false })

function ProtectedDeveloperContent({ children }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isDev, setIsDev] = useState(null) // null = loading, true/false = known

  useEffect(() => {
    const verifyDev = async () => {
      if (!session?.user?.id) return
      try {
        const res = await fetch(`/api/is-dev-user?userId=${session.user.id}`)
        const data = await res.json()
        if (!data.isDev) {
          router.push('/home')
        } else {
          setIsDev(true)
        }
      } catch (err) {
        console.error('🚫 Dev check failed:', err)
        router.push('/home')
      }
    }

    if (status === 'authenticated') {
      verifyDev()
    }
  }, [session?.user?.id, status, router])

  if (status === 'loading' || isDev === null) return null // or a loading spinner
  return children
}

export default function DeveloperLayout({ children }) {
  return (
    <SessionProvider>
      <Topbar />
      <ProtectedDeveloperContent>
        <div className={styles.container}>
          <DevSidebar />
          <main className={styles.content}>{children}</main>
        </div>
      </ProtectedDeveloperContent>
    </SessionProvider>
  )
}
