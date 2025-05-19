'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import styles from './Topbar.module.css'

export default function Topbar() {
  const { data: session } = useSession()
  const router = useRouter()
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
        console.log('❌ No user ID in session:', session)
        setDevChecked(true)
        return
      }

      console.log('✅ Session user ID:', session.user.id)

      try {
        const res = await fetch(`/api/is-dev-user?userId=${session.user.id}`)
        const data = await res.json()
        console.log('🛠 isDev response:', data)

        setIsDev(data.isDev || false)
      } catch (err) {
        console.error('🔥 Failed to check dev access:', err)
      } finally {
        setDevChecked(true)
      }
    }

    checkDevAccess()
  }, [session?.user?.id])

  if (!session?.user) {
    console.log('⚠️ No session.user, skipping topbar render.')
    return null
  }

  if (!devChecked) {
    console.log('⏳ Waiting for dev check...')
    return null
  }

  return (
    <div className={styles.topbar}>
      <div className={styles.right}>
        <div
          className={styles.avatarWrapper}
          onClick={() => setDropdownOpen(prev => !prev)}
        >
          <img
            src={session.user.image}
            alt="Profile"
            className={styles.avatar}
          />
        </div>

        {dropdownOpen && (
          <div className={styles.dropdown} ref={dropdownRef}>
            {console.log('🔍 Rendering dropdown – isDev:', isDev)}

            {isDev && (
              <button
                className={styles.devButton}
                onClick={() => router.push('/developer')}
              >
                🛠 Developer Panel
              </button>
            )}
            <button
              className={styles.logout}
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              📕 Log out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
