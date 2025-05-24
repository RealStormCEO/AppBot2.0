'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DashboardSidebar from '@/components/DevSidebar'
import Topbar from '@/components/Topbar'
import styles from './FeedbackView.module.css'

export default function DeveloperFeedbackDetail() {
  const { id } = useParams()
  const router = useRouter()

  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFeedback() {
      try {
        const res = await fetch(`/api/developer/feedback/${id}`)
        if (!res.ok) throw new Error('Failed to fetch feedback')
        const data = await res.json()
        setFeedback(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchFeedback()
  }, [id])

  if (loading) return <p className={styles.loading}>Loading feedback...</p>
  if (error) return <p className={styles.error}>{error}</p>
  if (!feedback) return <p className={styles.error}>Feedback not found</p>

  return (
    <div className={styles.container}>
      <DashboardSidebar />
      <div className={styles.mainContent}>
        <Topbar />

        <h1 className={styles.title}>🧑‍💻 Feedback Detail</h1>

        <div className={styles.detailCard}>
          <p><strong>User:</strong> {feedback.username}</p>
          <p><strong>Server:</strong> {feedback.guild_name || 'Unknown'}</p>
          <p><strong>Submitted:</strong> {new Date(feedback.submitted_at).toLocaleString()}</p>

          <div className={styles.feedbackText}>
            {feedback.feedback}
          </div>

          <button
            className={styles.backButton}
            onClick={() => router.back()}
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  )
}
