// src/app/(with-nav)/dashboard/[guild_id]/layout.jsx
import Topbar from '@/components/Topbar'
import DashboardSidebar from '@/components/DashboardSidebar'
import styles from './DashboardLayout.module.css'

export default function DashboardLayout({ children }) {
  return (
    <div className={styles.wrapper}>
      <Topbar />
      <div className={styles.body}>
        <DashboardSidebar />
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  )
}
