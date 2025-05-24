'use client'
import Link from 'next/link'
import styles from './DashboardSidebar.module.css'
import { useParams, usePathname } from 'next/navigation'

export default function DashboardSidebar() {
  const { guild_id } = useParams()
  const pathname = usePathname()

  const links = [
    { href: `/dashboard/${guild_id}`, label: '📋 Forms' },
    { href: `/applications/${guild_id}`, label: '📝 Applications' },
    { href: `/settings/${guild_id}`, label: '⚙️ Settings' }
  ]

  return (
    <div className={styles.sidebar}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`${styles.link} ${pathname.startsWith(link.href) ? styles.active : ''}`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  )
}
