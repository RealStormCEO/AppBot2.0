import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT id FROM guilds')
    return NextResponse.json({ guilds: rows })
  } catch (err) {
    console.error('[API ERROR] Failed to fetch guilds:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
