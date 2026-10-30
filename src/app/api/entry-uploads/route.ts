import { memoryMediaAction } from "@/app/actions/memories";

export const maxDuration = 60;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return Response.json({ error: "Upload request unavailable.", retryable: false }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 4096) return Response.json({ error: "Upload request too large.", retryable: false }, { status: 413 });
  let input: unknown;
  try {
    const body = await request.text();
    if (body.length > 4096) throw Error();
    input = JSON.parse(body);
  } catch { return Response.json({ error: "Check the upload details.", retryable: false }, { status: 400 }); }
  const result = await memoryMediaAction(input);
  return Response.json(result, { status: result.error ? result.status ?? 400 : 200, headers: { "Cache-Control": "no-store" } });
}
