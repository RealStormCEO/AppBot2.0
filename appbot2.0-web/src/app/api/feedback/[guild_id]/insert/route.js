import { getToken } from "next-auth/jwt";
import pool from "@/lib/db";

export async function POST(request, { params }) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { guild_id } = params; // get guild_id from URL param
    const data = await request.json();
    const { username, feedback } = data; // only username and feedback from body

    if (!guild_id || !username || !feedback) {
      return new Response("Missing required fields", { status: 400 });
    }

    await pool.query(
      "INSERT INTO feedback (guild_id, username, feedback, submitted_at) VALUES (?, ?, ?, NOW())",
      [guild_id, username, feedback]
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to submit feedback:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
