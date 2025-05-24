import pool from '@/lib/db'

export async function POST(req, { params }) {
  const { guild_id } = params;
  const { id, status } = await req.json();

  try {
    // Update application status
    const [result] = await pool.query(
      'UPDATE applications SET application_status = ? WHERE id = ? AND guild_id = ?',
      [status, id, guild_id]
    );

    if (result.affectedRows === 0) {
      return new Response('Application not found', { status: 404 });
    }

    return new Response(JSON.stringify({ message: 'Application updated' }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
