// src/app/(with-nav)/dashboard/[guild_id]/layout.jsx
import Topbar from '@/components/Topbar'
import DashboardSidebar from '@/components/DashboardSidebar'
import styles from './ApplicationsLayout.module.css'

export default function ApplicationsLayout({ children }) {
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
