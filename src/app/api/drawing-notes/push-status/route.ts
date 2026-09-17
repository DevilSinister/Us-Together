export async function GET() {
  return Response.json({ configured: Boolean(
    process.env.SUPABASE_SECRET_KEY && process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  ) }, { headers: { "Cache-Control": "no-store" } });
}
