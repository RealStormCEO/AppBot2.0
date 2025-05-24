'use client'
import styles from './Home.module.css'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react';

const feedbacks = [
  '🔥 "AppBot2.0 saved me hours setting up applications!" - RaidMaster88',
  '💼 "Perfect for managing team forms across multiple servers." - ClaraB',
  '🤖 "Simple. Powerful. Essential." - DevDude91',
  '🎯 "My server applications are 100x more efficient now!" - PixelatedAmy'
]

export default function HomePage() {
  const [currentFeedback, setCurrentFeedback] = useState(0)

  useEffect(() => {
    document.title = 'Home - AppBot2.0'
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeedback(prev => (prev + 1) % feedbacks.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div>
      {/* Top Bar */}
      <nav className={styles.navbar}>
        <div className={styles.logoArea}>
          <img src="/default-icon.jpg" alt="AppBot Logo" className={styles.logoImage} />
          <span className={styles.brand}>AppBot2.0</span>
        </div>
        <button
          className={styles.loginButton}
          onClick={() => signIn('discord')}
        >
          Login
        </button>
      </nav>

      {/* Hero Section */}
      <header className={styles.hero}>
        <h1>Automate and Elevate Your Discord Applications</h1>
        <p>The ultimate solution for managing server applications, approvals, and logs — all in one place.</p>
      </header>

      {/* Features Section */}
      <section className={styles.features}>
        <h2>What AppBot2.0 Can Do</h2>
        <ul>
          <li>📨 Custom application forms with multi-step logic</li>
          <li>📝 Store applications in a MySQL database</li>
          <li>📊 Developer panel for metrics and tracking</li>
          <li>🎛️ User-friendly web dashboard for managing servers</li>
          <li>🛡️ Moderation-friendly tools like role gating and logs</li>
        </ul>
      </section>

      {/* Testimonials */}
      <section className={styles.testimonials}>
        <p>{feedbacks[currentFeedback]}</p>
      </section>

      <footer className={styles.footer}>
        {"© "}{new Date().getFullYear()} RealStormCo. All rights reserved. <br />
        Developed by RealStormCo | Idea by TazzoTezz for the AppBot2.0 Discord ecosystem.
      </footer>
    </div>
  )
}
