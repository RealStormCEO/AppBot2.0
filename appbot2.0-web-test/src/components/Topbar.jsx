'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import styles from './Topbar.module.css'

export default function Topbar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isDev, setIsDev] = useState(false)
  const [devChecked, setDevChecked] = useState(false)
  const [guildName, setGuildName] = useState('')
  const dropdownRef = useRef(null)

  const onServersPage = pathname === '/servers'
  const isDeveloper = pathname?.startsWith('/developer')

  const getActiveGuildId = () => {
    const segments = pathname?.split('/')
    if (!segments || segments.length < 3) return null
    const [_, section, guildId] = segments
    const validSections = ['dashboard', 'applications', 'settings']
    if (validSections.includes(section) && /^\d+$/.test(guildId)) {
      return guildId
    }
    return null
  }

  const activeGuildId = getActiveGuildId()

  // 🔒 Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 🔑 Check developer access
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

  // 🧠 Fetch current guild name
  useEffect(() => {
    const fetchGuildName = async () => {
      if (!activeGuildId) {
        if (guildName !== '') setGuildName('')
        return
      }
      if (status !== 'authenticated' || !session?.accessToken) return
      try {
        const res = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        })
        const guilds = await res.json()
        const found = guilds.find(g => g.id === activeGuildId)
        if (found) setGuildName(found.name)
      } catch (err) {
        console.error('⚠️ Failed to fetch guild name:', err)
      }
    }
    fetchGuildName()
  }, [activeGuildId, session?.accessToken, status])

  if (status === 'loading') return null

  // Compose display text for guild name
  const guildDisplay = guildName ? `Editing Server: ${guildName}` : ''

  return (
    <div className={styles.topbar}>
      <div className={styles.logoArea}>
        <img src="/default-icon.jpg" alt="AppBot Logo" className={styles.logoImage} />
        <span className={styles.brand}>AppBot2.0</span>
      </div>

      {(isDeveloper || guildDisplay) && (
        <div className={styles.centerText}>
          <span className={styles.guildName}>
            {isDeveloper ? 'Developer Panel' : guildDisplay}
          </span>
        </div>
      )}

      <div className={styles.right}>
        {session?.user && (
          <div className={styles.avatarWrapper} onClick={() => setDropdownOpen(prev => !prev)}>
            <img src={session.user.image} alt="Profile" className={styles.avatar} />
          </div>
        )}

        {session?.user && dropdownOpen && (
          <div className={styles.dropdown} ref={dropdownRef}>
            {!onServersPage && (
              <button className={styles.devButton} onClick={() => router.push('/servers')}>
                🔁 Switch Servers
              </button>
            )}
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
