'use client'

import { useEffect, useState } from 'react'
import styles from './Users.module.css'

const expirationOptions = [
  { label: '1 Week', value: 7 },
  { label: '1 Month', value: 30 },
  { label: '6 Months', value: 182 },
  { label: '1 Year', value: 365 },
  { label: 'Developer', value: 9999 }
]

const addTimeOptions = [
  { label: '1 Day', value: 1 },
  { label: '3 Days', value: 3 },
  { label: '1 Week', value: 7 },
  { label: '2 Weeks', value: 14 }
]

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [plans, setPlans] = useState([]) // dynamically fetched plans
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ user_id: '', username: '', plan: '', expiration_days: 7 })

  const [editingId, setEditingId] = useState(null)
  const [editedUser, setEditedUser] = useState({ user_id: '', username: '', plan: '', expiration_days: 7 })
  const [confirmDelete, setConfirmDelete] = useState(null)

  const [showAddTime, setShowAddTime] = useState(false)
  const [addDays, setAddDays] = useState(1)

  useEffect(() => {
    fetchUsers()
    fetchPlans()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/developer/users')
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/developer/plans')
      if (!res.ok) throw new Error('Failed to fetch plans')
      const data = await res.json()
      setPlans(data)

      // Set default plan if empty
      setForm(f => ({ ...f, plan: f.plan || (data.length > 0 ? data[0].name : '') }))
      setEditedUser(eu => ({ ...eu, plan: eu.plan || (data.length > 0 ? data[0].name : '') }))
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    }
  }

  const handleAddUser = async () => {
    const expiration = new Date()
    expiration.setDate(expiration.getDate() + parseInt(form.expiration_days) + 1)

    try {
      await fetch('/api/developer/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, expiration_date: expiration })
      })
      setForm({ user_id: '', username: '', plan: plans.length > 0 ? plans[0].name : '', expiration_days: 7 })
      setShowForm(false)
      fetchUsers()
    } catch (err) {
      console.error('Failed to add user:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/developer/users/${id}`, { method: 'DELETE' })
      fetchUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
    }
  }

  const handleAddTime = async () => {
    try {
      await fetch('/api/developer/users/add-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: addDays })
      })
      setShowAddTime(false)
      fetchUsers()
    } catch (err) {
      console.error('❌ Failed to add time:', err)
    }
  }

  const startEditing = (user) => {
    setEditingId(user.id)
    setEditedUser({
      user_id: user.user_id,
      username: user.username,
      plan: user.plan,
      expiration_days: getDaysUntil(user.expiration_date)
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditedUser({ user_id: '', username: '', plan: plans.length > 0 ? plans[0].name : '', expiration_days: 7 })
  }

  const handleSaveEdit = async (id) => {
    const expiration = new Date()
    expiration.setDate(expiration.getDate() + parseInt(editedUser.expiration_days) + 1)

    try {
      await fetch(`/api/developer/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editedUser, expiration_date: expiration }),
      })
      cancelEditing()
      fetchUsers()
    } catch (err) {
      console.error('Failed to save edit:', err)
    }
  }

  const handleConfirmDelete = async (id) => {
    try {
      await fetch(`/api/developer/users/${id}`, { method: 'DELETE' })
      setConfirmDelete(null)
      fetchUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
    }
  }

  const getDaysUntil = (date) => {
    const now = new Date()
    const end = new Date(date)
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h1 className={styles.header}>👤 Users</h1>
        <div className={styles.buttonGroup}>
          <button className={styles.addButton} onClick={() => setShowAddTime(true)}>
            🕒 Add Time
          </button>

          {!showForm && (
            <button className={styles.addButton} onClick={() => setShowForm(true)} title="Add User">➕</button>
          )}
        </div>
      </div>

      {showAddTime && (
        <div className={styles.formRow}>
          <select
            value={addDays}
            onChange={(e) => setAddDays(parseInt(e.target.value))}
          >
            {addTimeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className={styles.formActions}>
            <button className={styles.saveButton} onClick={handleAddTime}>✅</button>
            <button className={styles.cancelButton} onClick={() => setShowAddTime(false)}>❌</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className={styles.formRow}>
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            type="text"
            placeholder="Discord User ID"
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
          />
          <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
            {plans.map(p => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <select value={form.expiration_days} onChange={(e) => setForm({ ...form, expiration_days: e.target.value })}>
            {expirationOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className={styles.formActions}>
            <button className={styles.saveButton} onClick={handleAddUser}>✅</button>
            <button className={styles.cancelButton} onClick={() => setShowForm(false)}>❌</button>
          </div>
        </div>
      )}

      <div className={styles.userTable}>
        {users.map(user => (
          <div key={user.id} className={styles.userRow}>
            {editingId === user.id ? (
              <>
                <input
                  type="text"
                  value={editedUser.username}
                  onChange={(e) => setEditedUser({ ...editedUser, username: e.target.value })}
                  className={styles.input}
                />
                <input
                  type="text"
                  value={editedUser.user_id}
                  onChange={(e) => setEditedUser({ ...editedUser, user_id: e.target.value })}
                  className={styles.input}
                />
                <select
                  value={editedUser.plan}
                  onChange={(e) => setEditedUser({ ...editedUser, plan: e.target.value })}
                  className={styles.input}
                >
                  {plans.map(p => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={editedUser.expiration_days}
                  onChange={(e) => setEditedUser({ ...editedUser, expiration_days: e.target.value })}
                  className={styles.input}
                >
                  {expirationOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className={styles.actions}>
                  <button onClick={() => handleSaveEdit(user.id)}>✅</button>
                  <button onClick={cancelEditing}>❌</button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.cell}>{user.username}</div>
                <div className={styles.cell}><code>{user.user_id}</code></div>
                <div className={styles.cell}>{user.plan}</div>
                <div className={styles.cell}>{new Date(user.expiration_date).toLocaleDateString()}</div>
                <div className={styles.actions}>
                  <button title="Edit" onClick={() => startEditing(user)}>✏️</button>
                  <button title="Delete" onClick={() => setConfirmDelete(user.id)}>🗑️</button>
                </div>
              </>
            )}
          </div>
        ))}

        {confirmDelete && (
          <div className={styles.modalBackdrop}>
            <div className={styles.modal}>
              <p>Are you sure you want to delete this user?</p>
              <div className={styles.modalButtons}>
                <button onClick={() => handleConfirmDelete(confirmDelete)}>✅ Confirm</button>
                <button onClick={() => setConfirmDelete(null)}>❌ Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
