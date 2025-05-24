import pool from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT f.id, f.username, f.feedback, f.submitted_at, g.name AS guild_name
      FROM feedback f
      LEFT JOIN guilds g ON f.guild_id = g.id
      ORDER BY f.submitted_at DESC
    `);

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to fetch developer feedback:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
