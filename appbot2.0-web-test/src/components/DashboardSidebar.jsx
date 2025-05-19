'use client'
import Link from 'next/link'
import styles from './DashboardSidebar.module.css'
import { usePathname } from 'next/navigation'

export default function DashboardSidebar({ guildId }) {
  const pathname = usePathname()

  const links = [
    { href: `/dashboard/${guildId}`, label: '📋 Forms' },
    { href: `/applications/${guildId}`, label: '📝 Applications' },
    { href: `/settings/${guildId}`, label: '⚙️ Settings' }
  ]

  return (
    <div className={styles.sidebar}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`${styles.link} ${pathname === link.href ? styles.active : ''}`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  )
}
