'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './EmbedBuilder.module.css'

export default function EmbedBuilder({ guild_id, type, onSave, onCancel }) {
  // State for embed fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#0099ff')
  const [tempColor, setTempColor] = useState('#0099ff')

  const [hasAuthor, setHasAuthor] = useState(false)
  const [authorName, setAuthorName] = useState('')
  const [authorUrl, setAuthorUrl] = useState('')
  const [authorIcon, setAuthorIcon] = useState('')

  const [hasFooter, setHasFooter] = useState(false)
  const [footerText, setFooterText] = useState('')
  const [footerIcon, setFooterIcon] = useState('')

  const [thumbnail, setThumbnail] = useState('')
  const [image, setImage] = useState('')

  const [fields, setFields] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal to show available variables
  const [variablesModalVisible, setVariablesModalVisible] = useState(false)

  // Placeholders available for insertion
  const placeholders = [
    { label: '{server.name}', description: 'Server Name', usage: 'Replaced with the server\'s name' },
    { label: '{server.id}', description: 'Server ID', usage: 'Replaced with the server\'s unique ID' },
    { label: '{user.name}', description: 'User Name', usage: 'Replaced with the user\'s username' },
    { label: '{user.id}', description: 'User ID', usage: 'Replaced with the user\'s unique ID' },
    { label: '{user.tag}', description: 'User Tag', usage: 'Replaced with the user\'s full tag (username#1234)' },
  ]

  // Refs for textareas/inputs to insert placeholders
  const titleRef = useRef(null)
  const descRef = useRef(null)
  const fieldNameRefs = useRef([])
  const fieldValueRefs = useRef([])

  // Insert placeholder text at cursor in specified input/textarea
  const insertAtCursor = (ref, text, fieldType = null, index = null) => {
    if (!ref?.current) return
    const el = ref.current
    const start = el.selectionStart
    const end = el.selectionEnd
    const val = el.value
    const newVal = val.substring(0, start) + text + val.substring(end)

    el.value = newVal

    // Update corresponding state
    if (el === titleRef.current) {
      setTitle(newVal)
    } else if (el === descRef.current) {
      setDescription(newVal)
    } else if (fieldType === 'name' && index !== null) {
      const newFields = [...fields]
      newFields[index].name = newVal
      setFields(newFields)
    } else if (fieldType === 'value' && index !== null) {
      const newFields = [...fields]
      newFields[index].value = newVal
      setFields(newFields)
    }

    // Reset cursor position after inserted text
    const cursorPos = start + text.length
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = cursorPos
      el.focus()
    }, 0)
  }

  const addField = () => setFields([...fields, { name: '', value: '', inline: false }])
  const updateField = (index, key, value) => {
    const newFields = [...fields]
    newFields[index][key] = value
    setFields(newFields)
  }
  const removeField = (index) => setFields(fields.filter((_, i) => i !== index))

  const hexToDecimal = (hex) => parseInt(hex.replace('#', ''), 16)

  // Helper function to recursively remove null/empty values from an object
  function cleanEmbedData(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;

    const cleaned = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      const value = obj[key];

      if (value === null || value === undefined) continue;

      if (typeof value === 'string' && value.trim() === '') continue;

      if (typeof value === 'object') {
        const nestedClean = cleanEmbedData(value);
        // For arrays: keep only if length > 0
        if (Array.isArray(nestedClean)) {
          if (nestedClean.length > 0) cleaned[key] = nestedClean;
        } else if (nestedClean && Object.keys(nestedClean).length > 0) {
          cleaned[key] = nestedClean;
        }
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  // Fetch embed data from API and populate fields
useEffect(() => {
  console.log('EmbedBuilder useEffect triggered', { guild_id, type })
  if (!guild_id) {
    setError('Missing guild ID')
    setLoading(false)
    return
  }

  setLoading(true)
  setError(null)

  async function fetchEmbed() {
    try {
      const res = await fetch(`/api/guilds/${guild_id}`)
      console.log('API response status:', res.status)
      if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`)
      const data = await res.json()
      console.log('API data:', data)

      const embedStr = type === 'accept' ? data.dm_accept_embed : data.dm_deny_embed
      const embedObj = embedStr ? JSON.parse(embedStr) : null

      if (embedObj) {
        const cleaned = cleanEmbedData(embedObj)
        console.log('Cleaned embed:', cleaned)

        setTitle(cleaned.title || '')
        setDescription(cleaned.description || '')

        if (cleaned.color !== undefined) {
          let hexColor = '#0099ff' // default fallback
          try {
            hexColor = '#' + Number(cleaned.color).toString(16).padStart(6, '0')
          } catch {}
          setColor(hexColor)
          setTempColor(hexColor)
        } else {
          setColor('#0099ff')
          setTempColor('#0099ff')
        }

        if (cleaned.author) {
          setHasAuthor(true)
          setAuthorName(cleaned.author.name || '')
          setAuthorUrl(cleaned.author.url || '')
          setAuthorIcon(cleaned.author.icon_url || '')
        } else {
          setHasAuthor(false)
          setAuthorName('')
          setAuthorUrl('')
          setAuthorIcon('')
        }

        if (cleaned.footer) {
          setHasFooter(true)
          setFooterText(cleaned.footer.text || '')
          setFooterIcon(cleaned.footer.icon_url || '')
        } else {
          setHasFooter(false)
          setFooterText('')
          setFooterIcon('')
        }

        setThumbnail(cleaned.thumbnail?.url || '')
        setImage(cleaned.image?.url || '')

        if (Array.isArray(cleaned.fields)) {
          setFields(cleaned.fields.map(f => ({
            name: f.name || '',
            value: f.value || '',
            inline: !!f.inline
          })))
        } else {
          setFields([])
        }
      } else {
        // No embed saved yet, clear fields
        setTitle('')
        setDescription('')
        setColor('#0099ff')
        setTempColor('#0099ff')
        setHasAuthor(false)
        setAuthorName('')
        setAuthorUrl('')
        setAuthorIcon('')
        setHasFooter(false)
        setFooterText('')
        setFooterIcon('')
        setThumbnail('')
        setImage('')
        setFields([])
      }
    } catch (err) {
      console.error('Failed to fetch embed:', err)
      setError('Failed to load embed data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  fetchEmbed()
}, [guild_id, type])

if (loading) return <p style={{ color: 'white', textAlign: 'center', marginTop: '2rem' }}>Loading embed data...</p>
if (error) return <p style={{ color: 'red', textAlign: 'center', marginTop: '2rem' }}>{error}</p>

  const handleSave = () => {
    let embedData = {
      title,
      description,
      color: hexToDecimal(color),
      fields: fields.filter(f => f.name && f.value),
    };

    if (hasAuthor) {
      embedData.author = {
        name: authorName,
        ...(authorUrl ? { url: authorUrl } : {}),
        ...(authorIcon ? { icon_url: authorIcon } : {}),
      };
    }

    if (hasFooter) {
      embedData.footer = {
        text: footerText,
        ...(footerIcon ? { icon_url: footerIcon } : {}),
      };
    }

    if (thumbnail) {
      embedData.thumbnail = { url: thumbnail };
    }

    if (image) {
      embedData.image = { url: image };
    }

    // Clean embed object before saving to remove null/empty props
    const cleanedEmbed = cleanEmbedData(embedData);

    onSave(cleanedEmbed);
  };

  const handleColorInputChange = (e) => setTempColor(e.target.value)
  const handleColorInputBlur = () => setColor(tempColor)

  if (loading) return <p>Loading embed data...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>
        {type === 'accept' ? 'DM Accept Embed Builder' : 'DM Deny Embed Builder'}
      </h2>

      <label className={styles.label}>Title</label>
      <textarea
        ref={titleRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        className={styles.input}
        placeholder="Embed title"
      />
      <div className={styles.placeholders}>
        {placeholders.map(ph => (
          <button
            key={ph.label}
            type="button"
            className={styles.placeholderButton}
            title={`${ph.description} - ${ph.usage}`}
            onClick={() => insertAtCursor(titleRef, ph.label)}
          >
            {ph.label}
          </button>
        ))}
      </div>

      <label className={styles.label}>Description</label>
      <textarea
        ref={descRef}
        value={description}
        onChange={e => setDescription(e.target.value)}
        className={styles.textarea}
        placeholder="Embed description"
      />
      <div className={styles.placeholders}>
        {placeholders.map(ph => (
          <button
            key={ph.label + '-desc'}
            type="button"
            className={styles.placeholderButton}
            title={`${ph.description} - ${ph.usage}`}
            onClick={() => insertAtCursor(descRef, ph.label)}
          >
            {ph.label}
          </button>
        ))}
      </div>

      {/* Additional fields like color, author, footer, thumbnail, image, etc. */}
      <label className={styles.label}>Color</label>
      <input
        type="color"
        value={tempColor}
        onChange={handleColorInputChange}
        onBlur={handleColorInputBlur}
        className={styles.colorInput}
      />

      {/* Author Section */}
      <div className={styles.toggleContainer}>
        <label className={styles.toggleSwitch}>
          <input
            type="checkbox"
            checked={hasAuthor}
            onChange={() => setHasAuthor(!hasAuthor)}
          />
          <span className={styles.slider}></span>
          Include Author
        </label>
      </div>

      {hasAuthor && (
        <div className={styles.group}>
          <div className={styles.groupTitle}>Author</div>
          <input
            type="text"
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            className={styles.input}
            placeholder="Name"
          />
          <input
            type="url"
            value={authorUrl}
            onChange={e => setAuthorUrl(e.target.value)}
            className={styles.input}
            placeholder="URL"
          />
          <input
            type="url"
            value={authorIcon}
            onChange={e => setAuthorIcon(e.target.value)}
            className={styles.input}
            placeholder="Icon URL"
          />
        </div>
      )}

      {/* Footer Section */}
      <div className={styles.toggleContainer}>
        <label className={styles.toggleSwitch}>
          <input
            type="checkbox"
            checked={hasFooter}
            onChange={() => setHasFooter(!hasFooter)}
          />
          <span className={styles.slider}></span>
          Include Footer
        </label>
      </div>

      {hasFooter && (
        <div className={styles.group}>
          <div className={styles.groupTitle}>Footer</div>
          <input
            type="text"
            value={footerText}
            onChange={e => setFooterText(e.target.value)}
            className={styles.input}
            placeholder="Text"
          />
          <input
            type="url"
            value={footerIcon}
            onChange={e => setFooterIcon(e.target.value)}
            className={styles.input}
            placeholder="Icon URL"
          />
        </div>
      )}

      {/* Thumbnail and Image */}
      <label className={styles.label}>Thumbnail URL</label>
      <input
        type="url"
        value={thumbnail}
        onChange={e => setThumbnail(e.target.value)}
        className={styles.input}
        placeholder="Thumbnail image URL"
      />

      <label className={styles.label}>Image URL</label>
      <input
        type="url"
        value={image}
        onChange={e => setImage(e.target.value)}
        className={styles.input}
        placeholder="Image URL"
      />

      {/* Fields Section */}
      <div className={styles.fieldsContainer}>
        <h3>Fields</h3>
        {fields.length === 0 && <p className={styles.noFields}>No fields added yet.</p>}
        {fields.map((field, index) => (
          <div key={index} className={styles.field}>
            <label className={styles.label}>Field Name</label>
            <input
              type="text"
              value={field.name}
              placeholder="Field name"
              onChange={e => updateField(index, 'name', e.target.value)}
              className={styles.input}
              ref={el => (fieldNameRefs.current[index] = el)}
            />
            <div className={styles.placeholders}>
              {placeholders.map(ph => (
                <button
                  key={ph.label + '-fieldname-' + index}
                  type="button"
                  className={styles.placeholderButton}
                  title={`${ph.description} - ${ph.usage}`}
                  onClick={() => insertAtCursor({ current: fieldNameRefs.current[index] }, ph.label, 'name', index)}
                >
                  {ph.label}
                </button>
              ))}
            </div>

            <label className={styles.label}>Field Value</label>
            <textarea
              value={field.value}
              placeholder="Field value"
              onChange={e => updateField(index, 'value', e.target.value)}
              className={styles.textarea}
              ref={el => (fieldValueRefs.current[index] = el)}
            />
            <div className={styles.placeholders}>
              {placeholders.map(ph => (
                <button
                  key={ph.label + '-fieldvalue-' + index}
                  type="button"
                  className={styles.placeholderButton}
                  title={`${ph.description} - ${ph.usage}`}
                  onClick={() => insertAtCursor({ current: fieldValueRefs.current[index] }, ph.label, 'value', index)}
                >
                  {ph.label}
                </button>
              ))}
            </div>

            <label className={styles.inlineLabel}>
              <input
                type="checkbox"
                checked={field.inline}
                onChange={e => updateField(index, 'inline', e.target.checked)}
              />
              Inline
            </label>
            <button
              type="button"
              onClick={() => removeField(index)}
              className={styles.removeButton}
            >
              Remove Field
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addField}
          className={styles.addButton}
        >
          Add Field
        </button>
      </div>

      {/* Buttons at bottom */}
      <div className={styles.buttonsContainer}>
        <button onClick={() => setVariablesModalVisible(true)} className={styles.variableButton}>
          Show Available Variables
        </button>
        <button onClick={handleSave} className={styles.saveButton}>Save Embed</button>
        <button onClick={onCancel} className={styles.cancelButton}>Cancel</button>
      </div>

      {/* Variables Modal */}
      {variablesModalVisible && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <h3>Available Variables</h3>
            <ul className={styles.variableList}>
              {placeholders.map(ph => (
                <li key={ph.label} className={styles.variableItem}>
                  <strong>{ph.label}</strong>: {ph.description} — <em>{ph.usage}</em>
                </li>
              ))}
            </ul>
            <button
              className={styles.confirmButton}
              onClick={() => setVariablesModalVisible(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
