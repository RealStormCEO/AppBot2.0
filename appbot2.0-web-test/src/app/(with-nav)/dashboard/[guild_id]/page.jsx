'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import styles from './Dashboard.module.css'

export default function DashboardPage() {
  const { guild_id } = useParams()
  const [forms, setForms] = useState([])

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const res = await fetch(`/api/forms/${guild_id}`)
        const data = await res.json()
        setForms(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error loading forms:', error)
      }
    }

    if (guild_id) fetchForms()
  }, [guild_id])

  return (
    <div className={styles.containerWithSidebar}>
      <h1 className={styles.heading}>📋 Application Forms</h1>
      <button className={styles.createButton}>➕ Create New Form</button>

      {forms.map((form) => (
        <div className={styles.formCard} key={form.id}>
          <span className={styles.formTitle}>{form.title}</span>
          <div className={styles.formActions}>
            <button className={styles.iconButton} title="Edit">✏️</button>
            <button className={styles.iconButtonDelete} title="Delete">🗑️</button>
          </div>
        </div>
      ))}
    </div>
  )
}
