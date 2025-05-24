'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './DevSidebar.module.css'

export default function DevSidebar() {
  const pathname = usePathname()

  const links = [
    { href: '/developer', label: '📊 Dashboard' },
    { href: '/developer/servers', label: '🛡 Servers' },
    { href: '/developer/users', label: '👥 Users' },
    { href: '/developer/dev-users', label: '🧠 Dev Users' },
    { href: '/servers', label: '🔙 Back to User Panel' }
  ]

  return (
    <div className={styles.sidebar}>
      {links.map(link => (
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
