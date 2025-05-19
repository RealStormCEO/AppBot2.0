'use client'
import { signIn } from 'next-auth/react'
import styles from './Login.module.css'

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome to AppBot2.0</h1>
        <p className={styles.subtitle}>Click below to sign in with Discord</p>
        <button className={styles.discordButton} onClick={() => signIn('discord')}>
          <img src="https://cdn-icons-png.flaticon.com/512/2111/2111370.png" alt="Discord" />
          Login with Discord
        </button>
      </div>
    </div>
  )
}
