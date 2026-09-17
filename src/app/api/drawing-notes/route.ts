import { Image } from "imagescript";
import { notifyDrawingRecipient } from "@/lib/drawings/push";
import { coupleContext } from "@/lib/couple/context";
import { inspectMedia } from "@/lib/memories/media";

export const runtime = "nodejs";
const SIZE = 2 * 1024 * 1024;
const failure = (message: string, status: number) => Response.json({ error: message }, { status });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return failure("This request cannot be sent here.", 403);
  let context: Awaited<ReturnType<typeof coupleContext>>;
  try { context = await coupleContext(); }
  catch { return failure("Sign in and try again.", 401); }
  if (context.kind === "preview" || !context.coupleId) return failure("Connect your partner before sending.", 403);
  let file: FormDataEntryValue | null;
  try { file = (await request.formData()).get("image"); }
  catch { return failure("Could not read the drawing.", 400); }
  if (!(file instanceof File) || file.type !== "image/png" || file.size < 100 || file.size > SIZE)
    return failure("Send a PNG drawing under 2 MB.", 400);
  let bytes: Uint8Array;
  try {
    const input = new Uint8Array(await file.arrayBuffer());
    const info = inspectMedia(input, "image/png");
    if (info.width !== 640 || info.height !== 480) return failure("The drawing must use the note canvas.", 400);
    const decoded = await Image.decode(input);
    bytes = await decoded.encode();
    if (bytes.byteLength > SIZE) return failure("The drawing is too large to send.", 400);
  } catch { return failure("The drawing image is invalid.", 400); }
  const { data: partner, error: partnerError } = await context.db.from("couple_memberships")
    .select("user_id").eq("couple_id", context.coupleId).is("left_at", null)
    .neq("user_id", context.userId).maybeSingle();
  if (partnerError || !partner) return failure("Your partner is not connected.", 403);
  const id = crypto.randomUUID();
  const path = context.userId + "/" + id + ".png";
  const { error: insertError } = await context.db.from("drawing_notes").insert({
    id, couple_id: context.coupleId, author_id: context.userId,
    recipient_id: partner.user_id, object_path: path,
  });
  if (insertError) return failure("Could not prepare the note. Try again.", 500);
  const { error: uploadError } = await context.db.storage.from("drawing-notes")
    .upload(path, bytes, { contentType: "image/png", upsert: false });
  if (uploadError) {
    await context.db.from("drawing_notes").delete().eq("id", id).eq("status", "pending");
    return failure("Could not upload the drawing. Try again.", 500);
  }
  const { data: sent, error: finishError } = await context.db.from("drawing_notes")
    .update({ status: "ready" }).eq("id", id).eq("status", "pending").select("id").maybeSingle();
  if (finishError || !sent) {
    await context.db.storage.from("drawing-notes").remove([path]);
    await context.db.from("drawing_notes").delete().eq("id", id).eq("status", "pending");
    return failure("Could not send the drawing. Try again.", 500);
  }
  await notifyDrawingRecipient(partner.user_id);
  return Response.json({ id }, { status: 201 });
}
