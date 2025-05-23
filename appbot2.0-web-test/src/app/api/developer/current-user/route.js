import { getToken } from "next-auth/jwt";
import pool from "@/lib/db";

export async function GET(request) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const [rows] = await pool.query(
      "SELECT id, username, plan, expiration_date FROM users WHERE user_id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return new Response("User not found", { status: 404 });
    }

    return new Response(JSON.stringify(rows[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to fetch current user:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
