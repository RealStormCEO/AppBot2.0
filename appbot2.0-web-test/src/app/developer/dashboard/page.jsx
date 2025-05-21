'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import styles from './DeveloperDashboard.module.css'

console.log('✅ page.jsx loaded')

const COLORS = ['#4bc0c0', '#2b2d31']

export default function DeveloperDashboard() {

    console.log('✅ DeveloperDashboard rendered')
  const [stats, setStats] = useState({
    servers: 0,
    forms: 0,
    questions: 0
  })

useEffect(() => {
  console.log('🔥 useEffect fired')
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/developer/stats', { cache: 'no-store' })
      const data = await res.json()
      console.log('📊 Stats:', data)
      setStats(data)
    } catch (err) {
      console.error('❌ Failed to load developer stats:', err)
    }
  }

  fetchStats()
}, [])


  const createChartData = (label, value) => [
    { name: label, value },
    { name: 'Remaining', value: Math.max(100 - value, 0) }
  ]

  const renderPieChart = (label, value) => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={createChartData(label, value)}
          dataKey="value"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
        >
          {createChartData(label, value).map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>🛠 Developer Dashboard</h1>
      <p className={styles.subtext}>Welcome to the control panel. Select a tab from the left.</p>

      <div className={styles.statsGrid}>
        <div className={styles.chartCard}>
          <h3>🌐 Servers</h3>
          {renderPieChart('Servers', stats.servers)}
        </div>

        <div className={styles.chartCard}>
          <h3>📋 Application Forms</h3>
          {renderPieChart('Forms', stats.forms)}
        </div>

        <div className={styles.chartCard}>
          <h3>📝 Questions</h3>
          {renderPieChart('Questions', stats.questions)}
        </div>
      </div>
    </div>
  )
}
