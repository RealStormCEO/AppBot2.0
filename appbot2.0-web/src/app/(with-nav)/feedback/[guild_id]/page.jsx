'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Head from 'next/head'
import DashboardSidebar from '@/components/DashboardSidebar'
import Topbar from '@/components/Topbar'
import styles from './Feedback.module.css'

export default function FeedbackPage() {
  const router = useRouter()
  const { guild_id } = useParams()

  const [creating, setCreating] = useState(false)
  const [username, setUsername] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const [feedbackList, setFeedbackList] = useState([])

  useEffect(() => {
    if (!guild_id) return
    fetchFeedbackList()
  }, [guild_id])

  useEffect(() => {
    if (guild_id) {
      document.title = `Feedback - ${guild_id} - AppBot 2.0`
    } else {
      document.title = 'Feedback - AppBot 2.0'
    }
  }, [guild_id])

  const fetchFeedbackList = async () => {
    try {
      const res = await fetch(`/api/feedback/${guild_id}`)
      if (res.ok) {
        const data = await res.json()
        setFeedbackList(data)
      } else {
        setFeedbackList([])
      }
    } catch {
      setFeedbackList([])
    }
  }

  const handleCreateClick = () => {
    setCreating(true)
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!username.trim() || !feedback.trim()) {
      setError('Both fields are required.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/feedback/${guild_id}/insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id, username: username.trim(), feedback: feedback.trim() }),
      })

      if (res.ok) {
        setSuccess('Feedback submitted successfully! Thank you.')
        setUsername('')
        setFeedback('')
        setCreating(false)
        fetchFeedbackList()
      } else {
        const data = await res.json()
        setError(data.message || 'Failed to submit feedback.')
      }
    } catch {
      setError('Failed to submit feedback.')
    }
    setLoading(false)
  }

  const handleCancel = () => {
    setCreating(false)
    setError('')
    setSuccess('')
  }

  const handleViewFeedback = (id) => {
    router.push(`/feedback/${guild_id}/${id}`)
  }

  return (
    <>
      <Head>
        <title>{guild_id ? `Feedback - ${guild_id} - AppBot 2.0` : 'Feedback - AppBot 2.0'}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.container}>
        <DashboardSidebar />
        <div className={styles.mainContent}>
          <Topbar />

          <div className={styles.feedbackHeader}>
            <h1 className={styles.title}>💬 Feedback</h1>
            {!creating && (
              <button className={styles.createButton} onClick={handleCreateClick} title="Add Feedback">
                ➕
              </button>
            )}
          </div>

          <div className={styles.wrapper}>
            {success && <p className={`${styles.message} ${styles.success}`}>{success}</p>}
            {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>}

            {creating && (
              <form className={styles.form} onSubmit={handleSubmit} noValidate>
                <label htmlFor="username" className={styles.label}>
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  className={styles.input}
                  placeholder="Your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                />

                <label htmlFor="feedback" className={styles.label}>
                  Feedback
                </label>
                <textarea
                  id="feedback"
                  className={styles.textarea}
                  placeholder="Your feedback..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  required
                  disabled={loading}
                />

                <div className={styles.buttons}>
                  <button type="submit" className={styles.buttonSubmit} disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit'}
                  </button>
                  <button type="button" className={styles.buttonCancel} onClick={handleCancel} disabled={loading}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {!creating && feedbackList.length === 0 && (
            <p className={styles.noFeedbackMessage}>No feedback submitted yet.</p>
          )}

          {!creating && feedbackList.length > 0 && (
            <div className={styles.feedbackListContainer}>
              <div className={styles.feedbackList}>
                {feedbackList.map((item) => (
                  <div key={item.id} className={styles.feedbackCard}>
                    <div className={styles.feedbackInfo}>
                      <span className={styles.feedbackUsername}>{item.username}</span>
                      <span className={styles.feedbackDate}>{new Date(item.submitted_at).toLocaleString()}</span>
                    </div>
                    <button
                      className={styles.viewButton}
                      onClick={() => handleViewFeedback(item.id)}
                      title="View Feedback"
                    >
                      🔍
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
