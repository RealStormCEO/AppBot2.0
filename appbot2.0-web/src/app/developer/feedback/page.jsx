'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardSidebar from '@/components/DevSidebar'
import Topbar from '@/components/Topbar'
import ConfirmModal from '@/components/ConfirmModal'
import styles from './DeveloperFeedback.module.css'
export const dynamic = 'force-dynamic';

export default function DeveloperFeedbackPage() {
  const router = useRouter()
  const [feedbackList, setFeedbackList] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    fetchFeedback()
  }, [])

  const fetchFeedback = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/developer/feedback')
      if (res.ok) {
        const data = await res.json()
        setFeedbackList(data)
      } else {
        setError('Failed to fetch feedback.')
      }
    } catch {
      setError('Failed to fetch feedback.')
    }
    setLoading(false)
  }

  const handleView = (id) => {
    router.push(`/developer/feedback/${id}`)
  }

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/developer/feedback/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setFeedbackList((prev) => prev.filter((item) => item.id !== id))
      } else {
        alert('Failed to delete feedback.')
      }
    } catch {
      alert('Failed to delete feedback.')
    }
    setConfirmDeleteId(null)
  }

  return (
    <div className={styles.container}>
      <DashboardSidebar />
      <div className={styles.mainContent}>
        <Topbar />

        <h1 className={styles.title}>🧑‍💻 Developer Feedback</h1>

        {error && <p className={styles.error}>{error}</p>}
        {loading && <p>Loading feedback...</p>}

        <div className={styles.feedbackList}>
          {feedbackList.map(({ id, username, guild_name, submitted_at }) => (
            <div key={id} className={styles.feedbackCard}>
              <div>
                <strong>User:</strong> {username} <br />
                <strong>Server:</strong> {guild_name || 'Unknown'} <br />
                <strong>Submitted:</strong> {new Date(submitted_at).toLocaleString()}
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.iconButtonView}
                  onClick={() => handleView(id)}
                  title="View Feedback"
                >
                  🔍
                </button>
                <button
                  className={styles.iconButtonDelete}
                  onClick={() => setConfirmDeleteId(id)}
                  title="Delete Feedback"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        {confirmDeleteId && (
          <ConfirmModal
            message="Are you sure you want to delete this feedback?"
            onConfirm={() => handleDelete(confirmDeleteId)}
            onCancel={() => setConfirmDeleteId(null)}
          />
        )}
      </div>
    </div>
  )
}
