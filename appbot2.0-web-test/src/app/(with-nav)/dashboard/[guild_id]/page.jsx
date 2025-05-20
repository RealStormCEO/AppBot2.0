'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import styles from './Dashboard.module.css'
import RequireAuth from '@/components/RequireAuth'

export default function DashboardPage() {
  const { guild_id } = useParams()
  const router = useRouter();
  const [forms, setForms] = useState([])
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

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

  const handleCreateForm = async () => {
    if (!newTitle.trim()) return
    try {
      const res = await fetch(`/api/forms/${guild_id}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })

      if (res.ok) {
        const newForm = await res.json()
        setForms(prev => [...prev, newForm])
        setNewTitle('')
        setCreating(false)
      }
    } catch (err) {
      console.error('Error creating form:', err)
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

  return (
    <RequireAuth>
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

        {creating && (
          <div className={styles.createModal}>
            <input
              type="text"
              value={newTitle}
              placeholder="Enter form name"
              onChange={(e) => setNewTitle(e.target.value)}
              className={styles.input}
            />
            <button className={styles.confirmButton} onClick={handleCreateForm}>✅</button>
            <button className={styles.cancelButton} onClick={() => setCreating(false)}>❌</button>
          </div>
        )}

        {forms.map((form) => (
          <div className={styles.formCard} key={form.id}>
            <span className={styles.formTitle}>{form.title}</span>
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
      </div>
    </RequireAuth>
  )
}
