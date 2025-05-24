import pool from "@/lib/db";

export async function GET(request, { params }) {
  try {
    const { guild_id, feedback_id } = params;

    if (!guild_id || !feedback_id) {
      return new Response("Guild ID and Feedback ID are required", { status: 400 });
    }

    // Fetch the single feedback by guild_id and feedback_id
    const [rows] = await pool.query(
      "SELECT id, username, feedback, submitted_at FROM feedback WHERE guild_id = ? AND id = ?",
      [guild_id, feedback_id]
    );

    if (rows.length === 0) {
      return new Response("Feedback not found", { status: 404 });
    }

    return new Response(JSON.stringify(rows[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to fetch feedback:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
