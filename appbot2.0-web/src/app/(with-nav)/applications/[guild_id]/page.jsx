'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Head from 'next/head'
import styles from './Applications.module.css'

export default function ApplicationsPage() {
  const { guild_id } = useParams()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedIds, setSelectedIds] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  const router = useRouter()

  // Fetch applications + form titles together for display
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch applications first
        const res = await fetch(`/api/applications/${guild_id}`)
        const appsData = await res.json()

        // Extract unique form_ids
        const uniqueFormIds = [...new Set(appsData.map(app => app.form_id))]

        // Fetch form titles for these form_ids
        // Assumes you have an API endpoint to batch fetch form titles by IDs, adjust if needed
        const formsRes = await fetch(`/api/forms/titles?ids=${uniqueFormIds.join(',')}`)
        const formsData = await formsRes.json() // Expected format: [{ id, title }, ...]

        // Map form_id to title for quick lookup
        const formTitlesMap = {}
        formsData.forEach(f => {
          formTitlesMap[f.id] = f.title
        })

        // Attach form title to each application
        const appsWithTitles = appsData.map(app => ({
          ...app,
          form_title: formTitlesMap[app.form_id] || 'Unknown Form'
        }))

        setApplications(appsWithTitles)
      } catch (err) {
        console.error('Error loading applications or form titles:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [guild_id])

  useEffect(() => {
    // Set dynamic document title whenever guild_id changes
    document.title = `Applications - ${guild_id} - AppBot 2.0`
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

  const handleBulkDelete = async () => {
    try {
      const res = await fetch(`/api/applications/${guild_id}/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      })

      if (res.ok) {
        setApplications(prev => prev.filter(app => !selectedIds.includes(app.id)))
        setSelectedIds([])
        setSelectAll(false)
        setConfirmBulkDelete(false)
      } else {
        console.error('❌ Failed to delete selected applications')
      }
    } catch (err) {
      console.error('❌ Bulk delete error:', err)
    }
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([])
    } else {
      setSelectedIds(applications.map(app => app.id))
    }
    setSelectAll(!selectAll)
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  return (
    <>
      <Head>
        <title>Applications - {guild_id} - AppBot 2.0</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.wrapper}>
        <h1 className={styles.title}>📄 Applications</h1>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {selectedIds.length > 0 && (
              <div className={styles.bulkActions}>
                <button className={styles.iconButtonDelete} onClick={() => setConfirmBulkDelete(true)}>
                  🗑️ Delete Selected
                </button>
              </div>
            )}
            {applications.length === 0 ? (
              <p>No applications submitted.</p>
            ) : (
              <>
                <div className={styles.tableHeader}>
                  <div className={styles.checkbox}>
                    <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
                  </div>
                  <span>User</span>
                  <span className={styles.formColumn}>Form</span> {/* New Form header */}
                  <span className={styles.scoreColumn}>AI Detection Score</span>
                  <span className={styles.submittedColumn}>Submitted</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>

                <ul className={styles.applicationList}>
                  {applications.map(app => (
                    <li key={app.id} className={styles.applicationCard}>
                      <div className={styles.checkbox}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(app.id)}
                          onChange={() => toggleSelect(app.id)}
                        />
                      </div>
                      <span>{app.username}</span>
                      <span className={styles.formColumn} title={app.form_title}>
                        {app.form_title.length > 25
                          ? app.form_title.slice(0, 22) + '...'
                          : app.form_title}
                      </span>
                      <span className={styles.scoreColumn}>
                        {(Math.round(app.ai_score * 100)).toFixed(1) + "%"}
                      </span>
                      <span className={styles.submittedColumn}>
                        {new Date(app.submitted_at).toLocaleString()}
                      </span>
                      <span>{statusLabel(app.application_status)}</span>
                      <div className={styles.actions}>
                        <button
                          className={styles.iconButton}
                          onClick={() => router.push(`/applications/${guild_id}/view/${app.id}`)}
                          title="View Application"
                        >
                          🔍
                        </button>
                        <button
                          className={styles.iconButtonDelete}
                          onClick={() => setConfirmDeleteId(app.id)}
                          title="Delete Application"
                        >
                          🗑️
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {confirmDeleteId !== null && (
              <div className={styles.modalBackdrop}>
                <div className={styles.modal}>
                  <p>Are you sure you want to delete this application?</p>
                  <div className={styles.modalButtons}>
                    <button className={styles.confirm} onClick={() => handleDelete(confirmDeleteId)}>✅ Confirm</button>
                    <button className={styles.cancel} onClick={() => setConfirmDeleteId(null)}>❌ Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {confirmBulkDelete && (
              <div className={styles.modalBackdrop}>
                <div className={styles.modal}>
                  <p>Are you sure you want to delete all selected applications?</p>
                  <div className={styles.modalButtons}>
                    <button className={styles.confirm} onClick={handleBulkDelete}>✅ Confirm</button>
                    <button className={styles.cancel} onClick={() => setConfirmBulkDelete(false)}>❌ Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
