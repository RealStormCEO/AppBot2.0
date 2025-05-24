import pool from '@/lib/db'

export async function DELETE(_, { params }) {
  const { id } = params

  try {
    await pool.query('DELETE FROM users WHERE id = ?', [id])
    return new Response('User deleted', { status: 200 })
  } catch (err) {
    console.error('❌ Failed to delete user:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}

export async function PUT(req, { params }) {
  const { id } = params
  const { user_id, username, plan, expiration_date } = await req.json()

  try {
    await pool.query(
      'UPDATE users SET user_id = ?, username = ?, plan = ?, expiration_date = ? WHERE id = ?',
      [user_id, username, plan, expiration_date, id]
    )
    return new Response('User updated', { status: 200 })
  } catch (err) {
    console.error('❌ Failed to update user:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
