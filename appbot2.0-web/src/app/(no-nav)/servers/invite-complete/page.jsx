'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
export const dynamic = 'force-dynamic';

export default function InviteCompletePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const invited = localStorage.getItem('invited_guild')
    if (!invited) {
      router.push('/servers')
      return
    }

    const checkBotPresence = async () => {
      try {
        const res = await fetch('/api/bot-guilds')
        const { ids } = await res.json()

        if (ids.includes(invited)) {
          localStorage.removeItem('invited_guild')
          router.push(`/dashboard/${invited}`)
        } else {
          // Retry after delay
          setTimeout(checkBotPresence, 2000)
        }
      } catch (err) {
        console.error('Bot check failed:', err)
        router.push('/servers')
      }
    }

    checkBotPresence()
  }, [router])

  return (
    <p style={{ padding: '2rem', fontSize: '1.2rem' }}>
      Finishing bot invite... Please wait.
    </p>
  )
}
