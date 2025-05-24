import pool from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req, { params }) {
  const { guild_id } = params

  if (!guild_id) {
    return NextResponse.json({ error: 'Missing guild_id' }, { status: 400 })
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM application_forms WHERE guild_id = ?',
      [guild_id.toString()]
    )
    return NextResponse.json(rows)
  } catch (err) {
    console.error('Database error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
