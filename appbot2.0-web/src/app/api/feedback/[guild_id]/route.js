import pool from "@/lib/db";

export async function GET(request, { params }) {
  try {
    const { guild_id } = params;

    if (!guild_id) {
      return new Response("Guild ID is required", { status: 400 });
    }

    // Fetch all feedback for the guild_id ordered by newest first
    const [rows] = await pool.query(
      "SELECT id, username, feedback, submitted_at FROM feedback WHERE guild_id = ? ORDER BY submitted_at DESC",
      [guild_id]
    );

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to fetch feedback:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
