import { z } from "zod";
import { coupleContext } from "@/lib/couple/context";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  try {
    const context = await coupleContext();
    if (context.kind === "preview") return new Response("Not found", { status: 404 });
    const { data: note } = await context.db.from("drawing_notes")
      .select("object_path").eq("id", id).eq("status", "ready").maybeSingle();
    if (!note) return new Response("Not found", { status: 404 });
    const { data } = await context.db.storage.from("drawing-notes").download(note.object_path);
    if (!data) return new Response("Not found", { status: 404 });
    return new Response(await data.arrayBuffer(), { headers: {
      "Content-Type": "image/png", "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  } catch { return new Response("Unavailable", { status: 404 }); }
}
