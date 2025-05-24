import React from 'react'
import styles from './ConfirmModal.module.css'

export default function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <p>{message}</p>
        <div className={styles.buttons}>
          <button className={styles.confirmBtn} onClick={onConfirm}>✅ Confirm</button>
          <button className={styles.cancelBtn} onClick={onCancel}>❌ Cancel</button>
        </div>
      </div>
    </div>
  )
}
