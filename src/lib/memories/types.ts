export type MemoryMedia = { id: string; media_type: string; mime_type: string; size_bytes: number; state: string; caption: string; width: number | null; height: number | null; duration_seconds: number | null; upload_expires_at: string };
export type Memory = { id: string; title: string; description: string | null; memory_date: string; location: string | null; rating: number | null; is_favorite: boolean; source_plan_id: string | null; source_bucket_item_id: string | null; version: number; tags: string[]; media: MemoryMedia[] };
export type MemoryPage = { memories: Memory[]; next: { date: string; id: string } | null };
export type MemoryDetail = { memory: Memory; preview: boolean; previewSession?:string; planTitle: string | null };
