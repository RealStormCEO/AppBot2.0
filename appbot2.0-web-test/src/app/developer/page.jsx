// src/app/developer/page.jsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DeveloperIndex() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/developer/dashboard')
  }, [router])

  return null
}
