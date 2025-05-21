'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation' // ✅ This is okay in client components
import styles from './Topbar.module.css'

export default function Topbar() {
  const { data: session } = useSession()
  const router = useRouter() // ✅ correct usage at the top level of a client component

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isDev, setIsDev] = useState(false)
  const [devChecked, setDevChecked] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const checkDevAccess = async () => {
      if (!session?.user?.id) {
        setDevChecked(true)
        return
      }

      try {
        const res = await fetch(`/api/is-dev-user?userId=${session.user.id}`)
        const data = await res.json()
        setIsDev(data.isDev || false)
      } catch (err) {
        console.error('🔥 Failed to check dev access:', err)
      } finally {
        setDevChecked(true)
      }
    }

    checkDevAccess()
  }, [session?.user?.id])

  if (!session?.user || !devChecked) return null

  return (
    <div className={styles.topbar}>
      <div className={styles.logoArea}>
        <img src="/default-icon.jpg" alt="AppBot Logo" className={styles.logoImage} />
        <span className={styles.brand}>AppBot2.0</span>
      </div>

      <div className={styles.right}>
        <div className={styles.avatarWrapper} onClick={() => setDropdownOpen(prev => !prev)}>
          <img src={session.user.image} alt="Profile" className={styles.avatar} />
        </div>

        {dropdownOpen && (
          <div className={styles.dropdown} ref={dropdownRef}>
            {isDev && (
              <button className={styles.devButton} onClick={() => router.push('/developer/dashboard')}>
                🛠 Developer Panel
              </button>
            )}
            <button className={styles.logout} onClick={() => signOut({ callbackUrl: '/home' })}>
              📕 Log out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
