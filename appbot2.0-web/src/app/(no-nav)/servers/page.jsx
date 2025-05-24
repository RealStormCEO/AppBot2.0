'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import styles from './Servers.module.css'
export const dynamic = 'force-dynamic';

const BOT_ID = process.env.NEXT_PUBLIC_BOT_CLIENT_ID

function getGuildIconUrl(guild) {
  if (!guild.icon) return '/default-icon.jpg'
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
}

export default function ServersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [userGuilds, setUserGuilds] = useState([])
  const [botGuilds, setBotGuilds] = useState(new Set())
  const [invitedGuild, setInvitedGuild] = useState(null)

  useEffect(() => {
    document.title = 'Servers - AppBot2.0'
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('invited_guild')
    if (stored) setInvitedGuild(stored)
  }, [])

  // 🔐 Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/home')
    }
  }, [status, router])

  // 📡 Fetch user guilds & bot guilds
  const fetchGuilds = async () => {
    try {
      const guildRes = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      })
      const guildJson = await guildRes.json()
      const validGuilds = guildJson.filter((g) => (g.permissions & 0x20) === 0x20)
      setUserGuilds(validGuilds)

      const botRes = await fetch('/api/bot-guilds')
      const { ids: botGuildIds } = await botRes.json()
      const botGuildsSet = new Set(botGuildIds.map((id) => id.toString()))
      setBotGuilds(botGuildsSet)
    } catch (err) {
      console.error('Guild fetch error:', err)
    }
  }

  // 🌀 Fetch on load and poll for updates
  useEffect(() => {
    if (!session?.accessToken) return

    fetchGuilds() // initial

    const interval = setInterval(() => {
      fetchGuilds()
    }, 3000)

    return () => clearInterval(interval)
  }, [session?.accessToken])

  useEffect(() => {
    if (!session?.accessToken || !invitedGuild) return

    const interval = setInterval(async () => {
      try {
        const botRes = await fetch('/api/bot-guilds')
        const { ids: botGuildIds } = await botRes.json()
        const botGuildsSet = new Set(botGuildIds.map((id) => id.toString()))

        if (botGuildsSet.has(invitedGuild)) {
          localStorage.removeItem('invited_guild')
          router.push(`/servers`)
        }
      } catch (err) {
        console.error('Redirect check failed:', err)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [session?.accessToken, invitedGuild, router])

  if (status === 'loading') return <p>Loading...</p>
  if (status === 'unauthenticated') return null

  const handleInvite = (guildId) => {
    // Store the invited guild ID in localStorage
    localStorage.setItem('invited_guild', guildId)

    const redirectUri = encodeURIComponent(`${window.location.origin}/servers/invite-complete`)
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${BOT_ID}&scope=bot+applications.commands&permissions=8596544&guild_id=${guildId}&disable_guild_select=true&redirect_uri=${redirectUri}&response_type=code`

    window.location.href = inviteUrl
  }

  return (
    <div className={styles.container}>
      {userGuilds.map((guild) => {
        const image = getGuildIconUrl(guild)
        const isBotIn = botGuilds.has(guild.id)

        return (
          <div key={guild.id} className={styles.card}>
            <img
              src={image}
              alt={guild.name}
              className={styles.avatar}
              onError={(e) => (e.currentTarget.src = '/default-icon.jpg')}
            />
            <h3 className={styles.title}>{guild.name}</h3>
            {isBotIn ? (
              <button
                className={`${styles.button} ${styles.settings}`}
                onClick={() => router.push(`/dashboard/${guild.id}`)}
              >
                ⚙️ Settings
              </button>
            ) : (
              <button
                className={`${styles.button} ${styles.invite}`}
                onClick={() => handleInvite(guild.id)}
              >
                ➕ Invite Bot
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
