'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function ProtectedRoute({ children }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const redirected = useRef(false)
  const unprotectedPaths = ['/home', '/login', '/register']

  const getGuildId = () => {
    const parts = pathname.split('/')
    return parts.length > 2 ? parts[2] : null
  }
  const guildId = getGuildId()

  useEffect(() => {
    if (status === 'loading') return // wait for session to resolve

      if (unprotectedPaths.includes(pathname)) {
    setIsAuthorized(true)
    return
  }

    if (status !== 'authenticated') {
      if (!redirected.current) {
        redirected.current = true
        router.push('/home')
      }
      return
    }

    if (!guildId) {
      if (!redirected.current) {
        redirected.current = true
        router.push('/home')
      }
      return
    }

    const checkAccess = async () => {
      try {
        const res = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        })

        if (!res.ok) {
          throw new Error(`Discord API error: ${res.status}`)
        }

        const guilds = await res.json()
        const match = guilds.find(g => g.id === guildId)

        if (match && (match.permissions & 0x8) === 0x8) {
          setIsAuthorized(true)
        } else {
          if (!redirected.current) {
            redirected.current = true
            router.push('/home')
          }
        }
      } catch (err) {
        console.error('Permission check failed:', err)
        if (!redirected.current) {
          redirected.current = true
          router.push('/home')
        }
      }
    }

    checkAccess()
  }, [status, session?.accessToken, guildId, router])

  if (status === 'loading' || !isAuthorized) return null

  return children
}
