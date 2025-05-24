'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './Settings.module.css'
import EmbedBuilder from '@/components/EmbedBuilder' // adjust path as needed

export default function SettingsPage() {
  const router = useRouter()
  const { guild_id } = useParams()

  const [settings, setSettings] = useState({
    dm_accept_enabled: false,
    dm_deny_enabled: false,
    auto_deny_enabled: false,
    auto_deny_threshold: 0,
    dm_accept_embed: null,
    dm_deny_embed: null,
    roles_to_add: [],
    roles_to_remove: [],
  })

  const [loading, setLoading] = useState(true)
  const [editingEmbedType, setEditingEmbedType] = useState(null)
  const [embedDraft, setEmbedDraft] = useState({ title: '', description: '', color: '#0099ff', fields: [] })
  const [serverRoles, setServerRoles] = useState([])

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(`/api/guild-settings/${guild_id}`)
        if (!res.ok) throw new Error('Failed to fetch guild settings')
        const data = await res.json()

        if (typeof data.dm_accept_embed === 'string') {
          try {
            data.dm_accept_embed = JSON.parse(data.dm_accept_embed)
          } catch {
            data.dm_accept_embed = null
          }
        }
        if (typeof data.dm_deny_embed === 'string') {
          try {
            data.dm_deny_embed = JSON.parse(data.dm_deny_embed)
          } catch {
            data.dm_deny_embed = null
          }
        }

        data.roles_to_add = Array.isArray(data.roles_to_add) ? data.roles_to_add : []
        data.roles_to_remove = Array.isArray(data.roles_to_remove) ? data.roles_to_remove : []

        setSettings({
          ...settings,
          ...data,
          auto_deny_enabled: data.auto_deny_enabled || false,
          auto_deny_threshold: data.auto_deny_threshold ?? 0,
        })
      } catch (err) {
        console.error('Failed to fetch guild settings', err)
      } finally {
        setLoading(false)
      }
    }

    async function fetchRoles() {
      try {
        const res = await fetch(`/api/guilds/${guild_id}/roles`)
        if (!res.ok) throw new Error('Failed to fetch roles')
        const rolesData = await res.json()
        setServerRoles(rolesData.filter(role => String(role.id) !== String(guild_id)))
      } catch (err) {
        console.error('Failed to fetch server roles', err)
      }
    }

    if (guild_id) {
      fetchSettings()
      fetchRoles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guild_id])

  useEffect(() => {
    if (guild_id) {
      document.title = `Settings - ${guild_id} - AppBot 2.0`
    } else {
      document.title = 'Settings - AppBot 2.0'
    }
  }, [guild_id])

  const saveSettings = async (newSettings) => {
    try {
      const res = await fetch(`/api/guild-settings/${guild_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSettings,
          dm_accept_embed: newSettings.dm_accept_embed ? JSON.stringify(newSettings.dm_accept_embed) : null,
          dm_deny_embed: newSettings.dm_deny_embed ? JSON.stringify(newSettings.dm_deny_embed) : null,
          roles_to_add: newSettings.roles_to_add || [],
          roles_to_remove: newSettings.roles_to_remove || [],
          auto_deny_enabled: newSettings.auto_deny_enabled || false,
          auto_deny_threshold: newSettings.auto_deny_threshold ?? 0,
        }),
      })
      if (!res.ok) throw new Error('Failed to save settings')
      setSettings(newSettings)
    } catch (err) {
      console.error(err)
      alert('Failed to save settings')
    }
  }

  const toggleDM = async (type) => {
    const newSettings = { ...settings }
    if (type === 'accept') newSettings.dm_accept_enabled = !newSettings.dm_accept_enabled
    else if (type === 'deny') newSettings.dm_deny_enabled = !newSettings.dm_deny_enabled
    await saveSettings(newSettings)
  }

  const toggleAutoDeny = async () => {
    const newSettings = { ...settings }
    newSettings.auto_deny_enabled = !newSettings.auto_deny_enabled
    await saveSettings(newSettings)
  }

  const setAutoDenyThreshold = async (value) => {
    const newSettings = { ...settings }
    const valNum = Number(value)
    newSettings.auto_deny_threshold = isNaN(valNum) ? 0 : Math.min(Math.max(valNum, 0), 100)
    await saveSettings(newSettings)
  }

  const openEmbedBuilder = (type) => {
    const draft = type === 'accept' ? settings.dm_accept_embed : settings.dm_deny_embed
    setEmbedDraft(draft || { title: '', description: '', color: '#0099ff', fields: [] })
    setEditingEmbedType(type)
  }

  const saveEmbedDraft = (newEmbed) => {
    const newSettings = { ...settings }
    if (editingEmbedType === 'accept') newSettings.dm_accept_embed = newEmbed
    else if (editingEmbedType === 'deny') newSettings.dm_deny_embed = newEmbed
    setSettings(newSettings)
    saveSettings(newSettings)
    setEditingEmbedType(null)
  }

  const addRoleToList = (roleId, listType) => {
    if (!roleId) return
    const newSettings = { ...settings }

    if (listType === 'add') {
      newSettings.roles_to_remove = newSettings.roles_to_remove.filter(r => r !== roleId)
      if (!newSettings.roles_to_add.includes(roleId)) {
        newSettings.roles_to_add = [...newSettings.roles_to_add, roleId]
      }
    } else if (listType === 'remove') {
      newSettings.roles_to_add = newSettings.roles_to_add.filter(r => r !== roleId)
      if (!newSettings.roles_to_remove.includes(roleId)) {
        newSettings.roles_to_remove = [...newSettings.roles_to_remove, roleId]
      }
    }
    saveSettings(newSettings)
  }

  const removeRoleFromList = (roleId, listType) => {
    const newSettings = { ...settings }
    if (listType === 'add') {
      newSettings.roles_to_add = newSettings.roles_to_add.filter(r => r !== roleId)
    } else if (listType === 'remove') {
      newSettings.roles_to_remove = newSettings.roles_to_remove.filter(r => r !== roleId)
    }
    saveSettings(newSettings)
  }

  if (editingEmbedType) {
    return (
      <EmbedBuilder
        initialEmbed={embedDraft}
        onSave={saveEmbedDraft}
        onCancel={() => setEditingEmbedType(null)}
        type={editingEmbedType}
        guild_id={guild_id}
      />
    )
  }

  if (loading) return <p className={styles.loading}>Loading...</p>

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Settings</h1>

      <div className={styles.cardsWrapper}>
        {/* DM Settings Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>DM Settings</h2>

          <div className={styles.option}>
            <label className={styles.switchLabel}>
              DM on Accept?
              <input
                type="checkbox"
                checked={settings.dm_accept_enabled}
                onChange={() => toggleDM('accept')}
                className={styles.switchInput}
              />
              <span className={styles.switchSlider}></span>
            </label>
            {settings.dm_accept_enabled && (
              <button className={styles.settingsButton} onClick={() => openEmbedBuilder('accept')}>
                ⚙️
              </button>
            )}
          </div>

          <div className={styles.option}>
            <label className={styles.switchLabel}>
              DM on Deny?
              <input
                type="checkbox"
                checked={settings.dm_deny_enabled}
                onChange={() => toggleDM('deny')}
                className={styles.switchInput}
              />
              <span className={styles.switchSlider}></span>
            </label>
            {settings.dm_deny_enabled && (
              <button className={styles.settingsButton} onClick={() => openEmbedBuilder('deny')}>
                ⚙️
              </button>
            )}
          </div>

          {/* Auto Deny group with border */}
          <div className={styles.optionGroup}>
            <div className={styles.option}>
              <label className={styles.switchLabel}>
                Auto Deny?
                <input
                  type="checkbox"
                  checked={settings.auto_deny_enabled}
                  onChange={toggleAutoDeny}
                  className={styles.switchInput}
                />
                <span className={styles.switchSlider}></span>
              </label>
            </div>

            {settings.auto_deny_enabled && (
              <div className={styles.autoDenySettings}>
                <label htmlFor="autoDenyThreshold" className={styles.label}>
                  Human Threshold (0 to 100):
                </label>
                <input
                  type="number"
                  id="autoDenyThreshold"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.auto_deny_threshold}
                  onChange={e => setAutoDenyThreshold(e.target.value)}
                  className={styles.input}
                />
              </div>
            )}
          </div>
        </div>

        {/* Roles to Add/Remove Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Roles to Add / Remove on Accept</h2>

          <label className={styles.label} htmlFor="rolesToAddSelect">Add Role:</label>
          <select
            id="rolesToAddSelect"
            onChange={e => {
              addRoleToList(e.target.value, 'add')
              e.target.value = ''
            }}
            defaultValue=""
            className={styles.input}
          >
            <option value="" disabled>Select a role to add</option>
            {serverRoles
              .filter(role => !settings.roles_to_add.includes(role.id) && !settings.roles_to_remove.includes(role.id))
              .map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
          </select>

          <div className={styles.roleTagsContainer}>
            {settings.roles_to_add.map(roleId => {
              const role = serverRoles.find(r => r.id === roleId)
              if (!role) return null
              return (
                <div key={roleId} className={styles.roleTag}>
                  {role.name}
                  <button
                    type="button"
                    className={styles.removeTagButton}
                    onClick={() => removeRoleFromList(roleId, 'add')}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>

          <label className={styles.label} htmlFor="rolesToRemoveSelect">Remove Role:</label>
          <select
            id="rolesToRemoveSelect"
            onChange={e => {
              addRoleToList(e.target.value, 'remove')
              e.target.value = ''
            }}
            defaultValue=""
            className={styles.input}
          >
            <option value="" disabled>Select a role to remove</option>
            {serverRoles
              .filter(role => !settings.roles_to_add.includes(role.id) && !settings.roles_to_remove.includes(role.id))
              .map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
          </select>

          <div className={styles.roleTagsContainer}>
            {settings.roles_to_remove.map(roleId => {
              const role = serverRoles.find(r => r.id === roleId)
              if (!role) return null
              return (
                <div key={roleId} className={styles.roleTag}>
                  {role.name}
                  <button
                    type="button"
                    className={styles.removeTagButton}
                    onClick={() => removeRoleFromList(roleId, 'remove')}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
