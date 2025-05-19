'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import styles from './Servers.module.css'
import { useRouter } from 'next/navigation'

const BOT_ID = process.env.NEXT_PUBLIC_BOT_CLIENT_ID

function getGuildIconUrl(guild) {
  if (!guild.icon) return '/default-icon.jpg'
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
}

export default function ServersPage() {
  const { data: session, status } = useSession()
  const router = useRouter() // ✅ Hook at top level
  const [userGuilds, setUserGuilds] = useState([])
  const [botGuilds, setBotGuilds] = useState(new Set())

    useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

useEffect(() => {
  if (!session?.accessToken) return;

  const fetchData = async () => {
    try {
      const guildRes = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });

      const guildJson = await guildRes.json();

      if (Array.isArray(guildJson)) {
        const validGuilds = guildJson.filter(g => (g.permissions & 0x20) === 0x20);
        setUserGuilds(validGuilds);
      }

      const botRes = await fetch('/api/bot-guilds');
      const { ids: botGuildIds } = await botRes.json();
      setBotGuilds(new Set(botGuildIds.map(id => id.toString())));
    } catch (err) {
      console.error('Failed to fetch guilds:', err);
    }
  };

  fetchData();
}, [session]);

if (status === 'loading') return <p>Loading...</p>;
if (status === 'unauthenticated') return null; // or router redirect

// Prevent rendering if userGuilds is undefined or not an array
{Array.isArray(userGuilds) && userGuilds.map(guild => (
  <div key={guild.id} className={styles.card}>
    ...
  </div>
))}


  return (
    <div>
      {/* <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '2rem 2rem 1rem' }}>
        🎉 Welcome to the Servers Page
      </h1> */}

      <div className={styles.container}>
        {userGuilds.map(guild => {
          const image = getGuildIconUrl(guild)
          const isBotIn = botGuilds.has(guild.id)

          return (
            <div key={guild.id} className={styles.card}>
              <img
                src={image}
                alt={guild.name}
                className={styles.avatar}
                onError={e => (e.currentTarget.src = '/default-icon.jpg')}
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
                <a
                  href={`https://discord.com/oauth2/authorize?client_id=${BOT_ID}&scope=bot+applications.commands&permissions=8&guild_id=${guild.id}&disable_guild_select=true`}
                  className={`${styles.button} ${styles.invite}`}
                >
                  ➕ Invite Bot
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}