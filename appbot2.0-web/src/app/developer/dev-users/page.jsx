'use client'

import { useEffect, useState } from 'react'
import styles from './DevUsers.module.css'

export default function DeveloperUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newUserId, setNewUserId] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [refresh, setRefresh] = useState(false)

  const [editMode, setEditMode] = useState(null)
  const [editedUsername, setEditedUsername] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/developer/dev-users')
        const data = await res.json()
        setUsers(data)
      } catch (err) {
        console.error('Error fetching users:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [refresh])

  const handleAdd = async () => {
    if (!newUserId.trim()) return
    await fetch('/api/developer/dev-users/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: newUserId.trim(), username: newUsername.trim() || 'Unknown' })
    })
    setNewUserId('')
    setNewUsername('')
    setShowAdd(false)
    setRefresh(!refresh)
  }

  const handleDelete = async (user_id) => {
    await fetch('/api/developer/dev-users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id })
    })
    setConfirmDeleteId(null)
    setRefresh(!refresh)
  }

  const handleSaveEdit = async (user_id) => {
    await fetch('/api/developer/dev-users/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, username: editedUsername.trim() })
    })
    setEditMode(null)
    setEditedUsername('')
    setRefresh(!refresh)
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>👨‍💻 Developer Users</h1>
        {!showAdd && (
          <button className={styles.iconButton} onClick={() => setShowAdd(true)}>➕</button>
        )}
      </div>

      {showAdd && (
        <div className={styles.addUserBox}>
          <input
            type="text"
            placeholder="User ID"
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            className={styles.input}
          />
          <input
            type="text"
            placeholder="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className={styles.input}
          />
          <button className={styles.addButton} onClick={handleAdd}>✅ Add</button>
          <button className={styles.cancelButton} onClick={() => setShowAdd(false)}>❌ Cancel</button>
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : users.length === 0 ? (
        <p>No developer users found.</p>
      ) : (
        <ul className={styles.userList}>
          {users.map(user => (
            <li key={user.user_id} className={styles.userCard}>
              {editMode === user.user_id ? (
                <>
                  <input
                    className={styles.input}
                    value={editedUsername}
                    onChange={(e) => setEditedUsername(e.target.value)}
                  />
                  <span>{user.user_id}</span>
                  <span>{new Date(user.added_at).toLocaleString()}</span>
                  <div className={styles.actionButtons}>
                    <button className={styles.saveButton} onClick={() => handleSaveEdit(user.user_id)}>💾</button>
                    <button className={styles.cancelButton} onClick={() => {
                      setEditMode(null)
                      setEditedUsername('')
                    }}>❌</button>
                  </div>
                </>
              ) : (
                <>
                  <span>{user.username}</span>
                  <span>{user.user_id}</span>
                  <span>{new Date(user.added_at).toLocaleString()}</span>
                  <div className={styles.actionButtons}>
                    <button className={styles.iconButton} onClick={() => {
                      setEditMode(user.user_id)
                      setEditedUsername(user.username)
                    }}>✏️</button>
                    <button className={styles.deleteButton} onClick={() => setConfirmDeleteId(user.user_id)}>🗑️</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <p>Are you sure you want to delete this developer user?</p>
            <div className={styles.modalButtons}>
              <button className={styles.confirm} onClick={() => handleDelete(confirmDeleteId)}>✅ Confirm</button>
              <button className={styles.cancelButton} onClick={() => setConfirmDeleteId(null)}>❌ Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
