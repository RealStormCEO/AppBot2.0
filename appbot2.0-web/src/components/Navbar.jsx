// components/Navbar.jsx
'use client'
import { useState } from 'react'
import ProfileDropdown from './ProfileDropdown'

export default function Navbar() {
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <nav className="navbar">
      <div className="nav-left">
        <a href="/dashboard" className="navbar-brand">AppBot2.0</a>
      </div>
      <div className="nav-right">
        <div className="profile-container" onClick={() => setShowDropdown(!showDropdown)}>
          <img src="/default-avatar.png" alt="Profile" className="profile-image" />
          {showDropdown && <ProfileDropdown />}
        </div>
      </div>
    </nav>
  )
}
