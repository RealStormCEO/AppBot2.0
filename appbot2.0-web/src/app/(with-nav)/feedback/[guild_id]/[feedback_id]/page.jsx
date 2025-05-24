'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Head from 'next/head'
import DashboardSidebar from '@/components/DashboardSidebar'
import Topbar from '@/components/Topbar'
import styles from './FeedbackView.module.css'  // new CSS module for this page

export default function FeedbackViewPage() {
  const router = useRouter()
  const { guild_id, feedback_id } = useParams()

  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!guild_id || !feedback_id) return

    const fetchFeedback = async () => {
      try {
        const res = await fetch(`/api/feedback/${guild_id}/${feedback_id}`)
        if (!res.ok) throw new Error('Failed to load feedback.')
        const data = await res.json()
        setFeedback(data)
      } catch (err) {
        setError(err.message)
      }
    }

    fetchFeedback()
  }, [guild_id, feedback_id])

  useEffect(() => {
    if (feedback) {
      document.title = `Feedback from ${feedback.username} - AppBot 2.0`
    } else {
      document.title = 'Loading Feedback... - AppBot 2.0'
    }
  }, [feedback])

  return (
    <>
      <Head>
        <title>{feedback ? `Feedback from ${feedback.username}` : 'Loading Feedback...'}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.container}>
        <DashboardSidebar />
        <div className={styles.mainContent}>
          <Topbar />

          <div className={styles.content}>
            {error && <p className={styles.errorMessage}>{error}</p>}

            {!error && !feedback && <p className={styles.loadingMessage}>Loading feedback...</p>}

            {feedback && (
              <>
                <h1 className={styles.title}>Feedback from {feedback.username}</h1>
                <p className={styles.subtext}>
                  Submitted on {new Date(feedback.submitted_at).toLocaleString()}
                </p>

                <div className={styles.feedbackBox}>
                  <p>{feedback.feedback}</p>
                </div>

                <button
                  className={styles.backButton}
                  onClick={() => router.back()}
                  aria-label="Back to feedback list"
                >
                  ← Back
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
