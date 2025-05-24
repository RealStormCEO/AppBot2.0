// src/app/api/developer/stats/route.js
import pool from '@/lib/db'

export async function GET() {
      console.log('🟢 Developer stats endpoint hit')
  try {
    const [servers] = await pool.query('SELECT COUNT(*) AS count FROM guilds')
    const [forms] = await pool.query('SELECT COUNT(*) AS count FROM application_forms')
    const [questions] = await pool.query('SELECT COUNT(*) AS count FROM application_questions')

    console.log('📊 Developer stats:', {
    servers: servers[0].count,
    forms: forms[0].count,
    questions: questions[0].count
  })


    return Response.json({
      servers: servers[0].count,
      forms: forms[0].count,
      questions: questions[0].count
    })
  } catch (err) {
    console.error('❌ Failed to load stats:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
