'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './ViewApplication.module.css'
import Head from 'next/head'

export default function ViewApplicationPage() {
  const { guild_id, id } = useParams()
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const res = await fetch(`/api/applications/${guild_id}/view/${id}`)
        const data = await res.json()
        setApplication(data)
      } catch (err) {
        console.error('Failed to load application:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchApp()
  }, [guild_id, id])

  useEffect(() => {
    if (loading) {
      document.title = 'Loading...'
    } else if (application?.username) {
      document.title = `Application - ${application.username} - AppBot 2.0`
    } else {
      document.title = 'Application - Unknown - AppBot 2.0'
    }
  }, [loading, application])

  const statusText = (status) => {
    switch (status) {
      case 1:
        return <span className={styles.statusPending}>⏳ Pending</span>
      case 2:
        return <span className={styles.statusAccepted}>✅ Accepted</span>
      case 3:
        return <span className={styles.statusDenied}>❌ Denied</span>
      default:
        return 'Unknown'
    }
  }

  const normalize = (str) =>
    str.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()

  const parseScores = (str) => {
    const map = {}
    const regex = /([^:]+):"((?:[^"\\]|\\.)*?)";([\d.]+)/g
    let match
    while ((match = regex.exec(str)) !== null) {
      const normalizedKey = normalize(match[1])
      const score = parseFloat(match[3])
      if (!isNaN(score)) {
        map[normalizedKey] = score
      }
    }
    return map
  }

  const handleDecision = async (newStatus) => {
    if (updating) return
    setUpdating(true)

    try {
      const res = await fetch(`/api/applications/${guild_id}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update application status')
      await res.json()
      setApplication((prev) => ({ ...prev, application_status: newStatus }))
      alert(`Application ${newStatus === 2 ? 'accepted' : 'denied'} successfully!`)
    } catch (error) {
      console.error(error)
      alert('Error updating application status.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <p className={styles.wrapper}>Loading...</p>
  if (!application) return <p className={styles.wrapper}>❌ Application not found.</p>

  const responses = JSON.parse(application.responses)
  const questionScores = parseScores(application.question_scores)

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.wrapper}>
        <h1 className={styles.title}>📄 Application from {application.username}</h1>

        <div className={styles.meta}>
          <p>
            <strong>🧠 AI Detection Score:</strong>{' '}
            <span className={styles.aiScore}>
              {(Math.ceil(application.ai_score * 100)).toFixed(1)}%
            </span>
          </p>
          <p>
            <strong>📅 Submitted:</strong>{' '}
            {new Date(application.submitted_at).toLocaleString()}
          </p>
          <p>
            <strong>📌 Status:</strong> {statusText(application.application_status)}
          </p>
        </div>

        <h2 className={styles.answersTitle}>📝 Answers</h2>
        <div className={styles.responses}>
          {Object.entries(responses).map(([question, answer]) => {
            const scoreKey = normalize(question)
            const score = questionScores[scoreKey]

            return (
              <div key={question} className={styles.responseCard}>
                <strong>{question}</strong>
                <p>{answer}</p>
                {score !== undefined && (
                  <p className={styles.scoreNote}>
                    🧠 AI Detection Score:{' '}
                    <strong>{(score * 100).toFixed(1)}% human</strong>
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* <div className={styles.buttons}>
          <button
            className={styles.accept}
            onClick={() => handleDecision(2)}
            disabled={updating || application.application_status === 2}
            title={application.application_status === 2 ? 'Already accepted' : 'Accept application'}
          >
            ✅ Accept
          </button>
          <button
            className={styles.deny}
            onClick={() => handleDecision(3)}
            disabled={updating || application.application_status === 3}
            title={application.application_status === 3 ? 'Already denied' : 'Deny application'}
          >
            ❌ Deny
          </button>
        </div> */}
      </div>
    </>
  )
}
