'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Head from 'next/head'
import styles from './Dashboard.module.css'
import RequireAuth from '@/components/RequireAuth'
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { guild_id } = useParams()
  const router = useRouter()
  const [forms, setForms] = useState([])
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const [channels, setChannels] = useState([])
  const [selectedChannelId, setSelectedChannelId] = useState('')

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [currentUser, setCurrentUser] = useState(null)
  const [plans, setPlans] = useState([])

  const [maxFormsModalVisible, setMaxFormsModalVisible] = useState(false)

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const userRes = await fetch('/api/developer/current-user')
        const userData = userRes.ok ? await userRes.json() : null
        setCurrentUser(userData)

        const plansRes = await fetch('/api/developer/plans')
        const plansData = plansRes.ok ? await plansRes.json() : []
        setPlans(plansData)

        if (guild_id) {
          const formsRes = await fetch(`/api/forms/${guild_id}`)
          const formsData = formsRes.ok ? await formsRes.json() : []
          setForms(formsData)

          const channelsRes = await fetch(`/api/forms/${guild_id}/channels`)
          const channelsData = channelsRes.ok ? await channelsRes.json() : []
          setChannels(channelsData)
        }
      } catch (err) {
        console.error('Failed to fetch initial data', err)
      }
    }
    fetchInitialData()
  }, [guild_id])

  const normalizedUserPlan = (currentUser?.plan || 'Free').trim().toLowerCase()
  const userPlanObj = plans.find(p => p.name.trim().toLowerCase() === normalizedUserPlan)
  const maxForms = userPlanObj?.max_forms || 1

  const handleCreateForm = async () => {
    setErrorMessage('')

    if (!newTitle.trim() || !selectedChannelId) return

    if (forms.length >= maxForms) {
      setMaxFormsModalVisible(true)
      return
    }

    try {
      const res = await fetch(`/api/forms/${guild_id}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, log_channel_id: selectedChannelId }),
      })

      if (res.ok) {
        const newForm = await res.json()
        setForms(prev => [...prev, newForm])
        setNewTitle('')
        setSelectedChannelId('')
        setCreating(false)
      } else {
        const err = await res.text()
        setErrorMessage('Failed to create form: ' + err)
      }
    } catch (err) {
      console.error('Error creating form:', err)
      setErrorMessage('Error creating form')
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return

    try {
      const res = await fetch(`/api/forms/${guild_id}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: confirmDelete.id }),
      })

      const data = await res.json()
      if (data.success) {
        setForms(prev => prev.filter(f => f.id !== confirmDelete.id))
        setConfirmDelete(null)
      } else {
        console.error('Delete failed:', data.error)
      }
    } catch (err) {
      console.error('❌ Delete error:', err)
    }
  }

  useEffect(() => {
    if (guild_id) {
      document.title = `Dashboard - ${guild_id} - AppBot 2.0`
    }
  }, [guild_id])

  return (
    <RequireAuth>
      <>
        <Head>
          <title>Dashboard - {guild_id} - AppBot 2.0</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <div className={styles.containerWithSidebar}>
          <div className={styles.formsHeader}>
            <h1 className={styles.heading}>📋 Application Forms</h1>

            {!creating && (
              <button
                className={styles.createButton}
                onClick={() => setCreating(true)}
                title="Create New Form"
              >
                ➕
              </button>
            )}
          </div>

          {errorMessage && <p style={{ color: 'red', textAlign: 'center' }}>{errorMessage}</p>}

          {creating && (
            <div className={styles.createModal}>
              <input
                type="text"
                value={newTitle}
                placeholder="Enter form name"
                onChange={(e) => setNewTitle(e.target.value)}
                className={styles.input}
              />
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className={styles.select}
              >
                <option value="">Select Log Channel</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>

              <button className={styles.confirmButton} onClick={handleCreateForm}>✅</button>
              <button className={styles.cancelButton} onClick={() => setCreating(false)}>❌</button>
            </div>
          )}

          {forms.map((form) => (
            <div className={styles.formCard} key={form.id}>
              <span className={styles.formTitle}>{form.title}</span>
              <select
                className={styles.selectInline}
                value={form.log_channel_id || ''}
                onChange={async (e) => {
                  const newChannelId = e.target.value
                  const res = await fetch(`/api/forms/${guild_id}/update-channel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      formId: form.id,
                      log_channel_id: newChannelId,
                    }),
                  })

                  if (res.ok) {
                    setForms(prev =>
                      prev.map(f =>
                        f.id === form.id ? { ...f, log_channel_id: newChannelId } : f
                      )
                    )
                    setSuccessMessage('✅ Log channel updated.')
                    setTimeout(() => setSuccessMessage(''), 2500)
                  } else {
                    console.error('❌ Failed to update log channel')
                  }
                }}
              >
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>

              <div className={styles.formActions}>
                <button
                  className={styles.iconButton}
                  title="Edit"
                  onClick={() => router.push(`/dashboard/${guild_id}/edit/${form.id}`)}
                >
                  ✏️
                </button>

                <button
                  className={styles.iconButtonDelete}
                  title="Delete"
                  onClick={() => setConfirmDelete(form)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

          {confirmDelete && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h3>Delete Form</h3>
                <p>Are you sure you want to delete <strong>{confirmDelete.title}</strong>?</p>
                <div className={styles.modalActions}>
                  <button onClick={() => setConfirmDelete(null)}>Cancel</button>
                  <button onClick={handleDelete} className={styles.danger}>Yes, Delete</button>
                </div>
              </div>
            </div>
          )}

          {maxFormsModalVisible && (
            <div className={styles.modalBackdrop}>
              <div className={styles.modal}>
                <p>
                  You have reached the max number of forms ({maxForms}) allowed for your plan ({currentUser?.plan || 'Free'}).
                </p>
                <div className={styles.modalButtons}>
                  <button className={styles.confirm} onClick={() => setMaxFormsModalVisible(false)}>OK</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    </RequireAuth>
  )
}
