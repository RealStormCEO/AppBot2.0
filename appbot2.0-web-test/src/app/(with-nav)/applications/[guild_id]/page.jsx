'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './Applications.module.css'

export default function ApplicationsPage() {
  const { guild_id } = useParams()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  const [viewingApp, setViewingApp] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/applications/${guild_id}`)
        const data = await res.json()
        setApplications(data)
      } catch (err) {
        console.error('Error loading applications:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [guild_id])

  const statusLabel = (status) => {
    switch (status) {
      case 1: return <span className={styles.statusPending}>⏳ Pending</span>
      case 2: return <span className={styles.statusAccepted}>✅ Accepted</span>
      case 3: return <span className={styles.statusDenied}>❌ Denied</span>
      default: return <span>Unknown</span>
    }
  }

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/applications/${guild_id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (res.ok) {
        setApplications(prev => prev.filter(app => app.id !== id))
        setConfirmDeleteId(null)
      } else {
        console.error('❌ Failed to delete application')
      }
    } catch (err) {
      console.error('❌ Delete error:', err)
    }
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>📄 Applications</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {applications.length === 0 ? (
            <p>No applications submitted.</p>
          ) : (
            <>
              <div className={styles.tableHeader}>
                <span>User</span>
                <span className={styles.scoreColumn}>AI Detection Score</span>
                <span className={styles.submittedColumn}>Submitted</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              <ul className={styles.applicationList}>
                {applications.map(app => (
                  <li key={app.id} className={styles.applicationCard}>
                    <span>{app.username}</span>
                    <span className={styles.scoreColumn}>
                      {(Math.round(app.ai_score * 100) / 100).toFixed(2)}
                    </span>
                    <span className={styles.submittedColumn}>
                      {new Date(app.submitted_at).toLocaleString()}
                    </span>
                    <span>{statusLabel(app.application_status)}</span>
                    <div className={styles.actions}>
                      <button
                        className={styles.iconButton}
                        onClick={() => router.push(`/applications/${guild_id}/view/${app.id}`)}
                      >
                        🔍
                      </button>
                      <button className={styles.iconButtonDelete} onClick={() => setConfirmDeleteId(app.id)}>🗑️</button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {viewingApp && (
            <div className={styles.modalBackdrop}>
              <div className={styles.modal}>
                <h2>📄 Application Details</h2>
                <p><strong>👤 Username:</strong> {viewingApp.username}</p>
                <p><strong>📅 Submitted At:</strong> {viewingApp.submitted_at}</p>
                <p><strong>🤖 AI Score:</strong> {viewingApp.ai_score}</p>
                <p><strong>📌 Status:</strong> {
                  viewingApp.application_status === 1 ? 'Pending' :
                  viewingApp.application_status === 2 ? 'Accepted' :
                  'Denied'
                }</p>

                <div style={{ marginTop: '1rem' }}>
                  <h3>📝 Responses:</h3>
                  {Object.entries(JSON.parse(viewingApp.responses)).map(([question, answer]) => (
                    <p key={question}><strong>{question}</strong><br />{answer}</p>
                  ))}
                </div>

                <div className={styles.modalButtons}>
                  <button className={styles.cancel} onClick={() => setViewingApp(null)}>❌ Close</button>
                </div>
              </div>
            </div>
          )}

          {confirmDeleteId !== null && (
            <div className={styles.modalBackdrop}>
              <div className={styles.modal}>
                <p>Are you sure you want to delete this application?</p>
                <div className={styles.modalButtons}>
                  <button
                    className={styles.confirm}
                    onClick={() => handleDelete(confirmDeleteId)}
                  >
                    ✅ Confirm
                  </button>
                  <button className={styles.cancel} onClick={() => setConfirmDeleteId(null)}>
                    ❌ Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
