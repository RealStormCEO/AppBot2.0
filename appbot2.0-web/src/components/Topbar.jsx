'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import styles from './Topbar.module.css'

const SUPPORT_SERVER = process.env.NEXT_PUBLIC_SUPPORT_SERVER || '#'

export default function Topbar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isDev, setIsDev] = useState(false)
  const [devChecked, setDevChecked] = useState(false)
  const [guildName, setGuildName] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [plans, setPlans] = useState([])

  const [timeRemaining, setTimeRemaining] = useState('')

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

  useEffect(() => {
    async function fetchUserAndPlans() {
      if (!session?.user?.id) return
      try {
        const userRes = await fetch('/api/developer/current-user')
        const userData = userRes.ok ? await userRes.json() : null
        setCurrentUser(userData)

        const plansRes = await fetch('/api/developer/plans')
        const plansData = plansRes.ok ? await plansRes.json() : []
        setPlans(plansData)
      } catch (err) {
        console.error('Failed to fetch user or plans:', err)
      }
    }
    fetchUserAndPlans()
  }, [session?.user?.id])

  // Countdown timer effect for expiration_date
  useEffect(() => {
    if (!currentUser?.expiration_date) {
      setTimeRemaining('')
      return
    }

    function updateTime() {
      const now = new Date()
      const exp = new Date(currentUser.expiration_date)
      let diff = exp - now

      if (diff <= 0) {
        setTimeRemaining('Expired')
        return
      }

      const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365))
      diff -= years * (1000 * 60 * 60 * 24 * 365)

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      diff -= days * (1000 * 60 * 60 * 24)

      const hours = Math.floor(diff / (1000 * 60 * 60))
      diff -= hours * (1000 * 60 * 60)

      const minutes = Math.floor(diff / (1000 * 60))

      const parts = []
      if (years > 0) parts.push(`${years}y`)
      if (days > 0) parts.push(`${days}d`)
      if (hours > 0) parts.push(`${hours}h`)
      parts.push(`${minutes}m`)

      setTimeRemaining(parts.join(', '))
    }

    updateTime()
    const interval = setInterval(updateTime, 60 * 1000)

    return () => clearInterval(interval)
  }, [currentUser?.expiration_date])

  if (status === 'loading') return null

  const guildDisplay = guildName ? `Editing Server: ${guildName}` : ''

  const normalizedUserPlan = (currentUser?.plan || 'Free').trim().toLowerCase()
  const userPlanObj = plans.find(p => p.name.trim().toLowerCase() === normalizedUserPlan)

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

            <div className={styles.userInfoDropdown}>
              <div><strong>User:</strong> {currentUser?.username || session.user.name}</div>
              <div><strong>Plan:</strong> {userPlanObj?.name || currentUser?.plan || 'Free'}</div>
              <div><strong>Max Forms:</strong> {userPlanObj?.max_forms ?? 'N/A'}</div>
              <div><strong>Max Questions:</strong> {userPlanObj?.max_questions ?? 'N/A'}</div>
              <div>
                <strong>Time Remaining:</strong><br />
                <span>{timeRemaining || 'N/A'}</span>
              </div>
            </div>

            {/* Support Server Button */}
            <a
              href={SUPPORT_SERVER}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.devButton}
              style={{ textAlign: 'center' }}
            >
              🔗 Join Support Server
            </a>

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
