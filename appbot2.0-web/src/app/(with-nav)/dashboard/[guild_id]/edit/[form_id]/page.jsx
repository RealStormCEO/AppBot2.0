'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DragDropContext, Draggable } from 'react-beautiful-dnd'
import StrictModeDroppable from '@/components/StrictModeDroppable'
import styles from './EditForm.module.css'

export default function EditFormPage() {
  const { guild_id, form_id } = useParams()

  const [questions, setQuestions] = useState([])
  const [originalOrder, setOriginalOrder] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const [newQuestion, setNewQuestion] = useState('')
  const [questionType, setQuestionType] = useState('short')
  const [minWords, setMinWords] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editedQuestion, setEditedQuestion] = useState('')
  const [editedType, setEditedType] = useState('')
  const [editedMinWords, setEditedMinWords] = useState('')

  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [maxQuestionsModalVisible, setMaxQuestionsModalVisible] = useState(false)

  const [currentUser, setCurrentUser] = useState(null)
  const [plans, setPlans] = useState([])

  // Set the document title dynamically based on guild_id and form_id
  useEffect(() => {
    if (guild_id && form_id) {
      document.title = `Editing Form ${form_id} - ${guild_id} - AppBot 2.0`
    } else {
      document.title = 'Editing Form - AppBot 2.0'
    }
  }, [guild_id, form_id])

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const userRes = await fetch('/api/developer/current-user')
        const userData = userRes.ok ? await userRes.json() : null
        setCurrentUser(userData)

        const plansRes = await fetch('/api/developer/plans')
        const plansData = plansRes.ok ? await plansRes.json() : []
        setPlans(plansData)

        if (guild_id && form_id) {
          const res = await fetch(`/api/forms/${guild_id}/questions/${form_id}`)
          const data = await res.json()
          if (Array.isArray(data)) {
            setQuestions(data)
            setOriginalOrder(data.map(q => q.id))
          }
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchInitialData()
  }, [guild_id, form_id])

  // Rest of your existing component logic below...

  const normalizedUserPlan = (currentUser?.plan || 'Free').trim().toLowerCase()
  const userPlanObj = plans.find(p => p.name.trim().toLowerCase() === normalizedUserPlan)
  const maxQuestions = userPlanObj?.max_questions || 5

  const hasChanges = JSON.stringify(questions.map(q => q.id)) !== JSON.stringify(originalOrder)

  const handleDragEnd = result => {
    if (!result.destination) return
    const updated = Array.from(questions)
    const [moved] = updated.splice(result.source.index, 1)
    updated.splice(result.destination.index, 0, moved)
    setQuestions(updated)
  }

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/forms/${guild_id}/questions/${form_id}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: questions.map(q => q.id) }),
      })
      if (res.ok) {
        setOriginalOrder(questions.map(q => q.id))
      }
    } catch (err) {
      console.error('Save error:', err)
    }
  }

  const handleCancel = () => {
    const reordered = [...originalOrder].map(id => questions.find(q => q.id === id))
    setQuestions(reordered)
  }

  const handleCreate = async () => {
    if (!newQuestion.trim()) return

    if (questions.length >= maxQuestions) {
      setMaxQuestionsModalVisible(true)
      return
    }

    try {
      const res = await fetch(`/api/forms/${guild_id}/questions/${form_id}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newQuestion,
          type: questionType,
          word_count_min: minWords ? parseInt(minWords) : null,
        }),
      })

      if (res.ok) {
        const newQ = await res.json()
        setQuestions(prev => [...prev, newQ])
        setOriginalOrder(prev => [...prev, newQ.id])
        setNewQuestion('')
        setMinWords('')
        setQuestionType('short')
        setShowCreate(false)
      } else {
        console.error('Error creating question')
      }
    } catch (err) {
      console.error('❌ Error submitting new question:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/forms/${guild_id}/questions/${form_id}/delete?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setQuestions(prev => prev.filter(q => q.id !== id))
        setOriginalOrder(prev => prev.filter(i => i !== id))
      } else {
        console.error('Failed to delete')
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleConfirmDelete = async (id) => {
    try {
      const res = await fetch(`/api/forms/${guild_id}/questions/${form_id}/delete?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setQuestions(prev => prev.filter(q => q.id !== id))
        setOriginalOrder(prev => prev.filter(qid => qid !== id))
        setConfirmDeleteId(null)
      } else {
        console.error('❌ Failed to delete question')
      }
    } catch (err) {
      console.error('❌ Delete error:', err)
    }
  }

  const startEditing = (q) => {
    setEditingId(q.id)
    setEditedQuestion(q.question)
    setEditedType(q.type)
    setEditedMinWords(q.word_count_min ?? '')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditedQuestion('')
    setEditedType('')
    setEditedMinWords('')
  }

  const saveEdit = async (id) => {
    try {
      const res = await fetch(`/api/forms/${guild_id}/questions/${form_id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          question: editedQuestion,
          type: editedType,
          word_count_min: editedMinWords ? parseInt(editedMinWords) : null,
        }),
      })

      if (res.ok) {
        const updated = questions.map(q =>
          q.id === id
            ? { ...q, question: editedQuestion, type: editedType, word_count_min: editedMinWords }
            : q
        )
        setQuestions(updated)
        cancelEditing()
      } else {
        console.error('Failed to update question.')
      }
    } catch (err) {
      console.error('Error saving edits:', err)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.title}>📝 Editing Form</h1>
        {!showCreate && (
          <button className={styles.addButton} onClick={() => setShowCreate(true)}>➕</button>
        )}
      </div>

      {showCreate && (
        <div className={styles.createArea}>
          <input
            placeholder="Enter question..."
            className={styles.input}
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
          />
          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
            className={styles.input}
          >
            <option value="short">Short Answer</option>
            <option value="long">Long Answer</option>
            <option value="yesno">Yes / No</option>
          </select>
          <input
            type="number"
            placeholder="Min Words"
            className={styles.input}
            value={minWords}
            onChange={(e) => setMinWords(e.target.value)}
          />
          <button className={styles.confirm} onClick={handleCreate}>✅</button>
          <button className={styles.cancel} onClick={() => setShowCreate(false)}>❌</button>
        </div>
      )}

      {!loading && questions.length > 0 && (
        <>
          {hasChanges && (
            <div className={styles.reorderBar}>
              <button className={styles.saveOrder} onClick={handleSave}>💾 Save Order</button>
              <button className={styles.cancelOrder} onClick={handleCancel}>❌ Cancel</button>
            </div>
          )}
          <div className={styles.tableHeader}>
            <span>Question</span>
            <span>Type</span>
            <span>Min-Words</span>
            <span>Actions</span>
          </div>
        </>
      )}

      {loading ? (
        <p className={styles.status}>Loading questions...</p>
      ) : questions.length === 0 ? (
        <p className={styles.status}>📭 Form Empty</p>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <StrictModeDroppable droppableId="questions">
            {provided => (
              <ul className={styles.questionList} {...provided.droppableProps} ref={provided.innerRef}>
                {questions.map((q, index) => (
                  <Draggable key={q.id} draggableId={String(q.id)} index={index}>
                    {provided => (
                      <li
                        className={styles.questionCard}
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        {editingId === q.id ? (
                          <>
                            <input value={editedQuestion} onChange={(e) => setEditedQuestion(e.target.value)} className={styles.input} />
                            <select value={editedType} onChange={(e) => setEditedType(e.target.value)} className={styles.input}>
                              <option value="short">Short</option>
                              <option value="long">Long</option>
                              <option value="yesno">Yes/No</option>
                            </select>
                            <input type="number" value={editedMinWords} onChange={(e) => setEditedMinWords(e.target.value)} className={styles.input} />
                            <div className={styles.formActions}>
                              <button className={styles.iconButton} onClick={() => saveEdit(q.id)}>✅</button>
                              <button className={styles.iconButtonDelete} onClick={cancelEditing}>❌</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span>{q.question}</span>
                            <span>{q.type}</span>
                            <span>{q.word_count_min ?? 'N/A'}</span>
                            <div className={styles.formActions}>
                              <button className={styles.iconButton} onClick={() => startEditing(q)} title="Edit">✏️</button>
                              <button
                                className={styles.iconButtonDelete}
                                title="Delete"
                                onClick={() => setConfirmDeleteId(q.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </StrictModeDroppable>

          {confirmDeleteId !== null && (
            <div className={styles.modalBackdrop}>
              <div className={styles.modal}>
                <p>Are you sure you want to delete this question?</p>
                <div className={styles.modalButtons}>
                  <button
                    className={styles.confirm}
                    onClick={() => handleConfirmDelete(confirmDeleteId)}
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

          {maxQuestionsModalVisible && (
            <div className={styles.modalBackdrop}>
              <div className={styles.modal}>
                <p>
                  You have reached the max number of questions ({maxQuestions}) allowed for your plan ({userPlanObj?.name || 'Free'}).
                </p>
                <div className={styles.modalButtons}>
                  <button className={styles.confirm} onClick={() => setMaxQuestionsModalVisible(false)}>OK</button>
                </div>
              </div>
            </div>
          )}
        </DragDropContext>
      )}
    </div>
  )
}
