'use client'

import { useEffect, useState } from 'react'
import styles from './Servers.module.css'
export const dynamic = 'force-dynamic';

export default function ServersPage() {
  const [servers, setServers] = useState([])

useEffect(() => {
  const fetchServers = async () => {
    try {
      const res = await fetch('/api/developer/servers', {
        cache: 'no-store',
        next: { revalidate: 0 }
      });
      const data = await res.json();
      console.log('✅ Servers fetched:', data); // Add this
      setServers(data);
    } catch (err) {
      console.error('❌ Failed to fetch servers:', err);
    }
  };

  fetchServers();
}, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>🌐 Servers</h1>
      <p className={styles.subtext}>List of all connected Discord servers.</p>

      {servers.length === 0 ? (
        <p className={styles.subtext}>⚠️ No servers found.</p>
      ) : (
<div className={styles.serverList}>
  {servers.map((server) => (
    <div key={server.id} className={styles.serverRow}>
      <div className={styles.serverInfo}>
        <div className={styles.serverName}>{server.name}</div>
        <div className={styles.serverMeta}>
          <span>ID: <code>{server.id}</code></span>
          <span>Joined: {new Date(server.joined_at).toLocaleString()}</span>
        </div>
      </div>
      <div className={styles.actions}>
        <button className={styles.iconButton} title="Edit">✏️</button>
        <button className={styles.iconButton} title="Delete">🗑️</button>
      </div>
    </div>
  ))}
</div>
      )}
    </div>
  )
}
