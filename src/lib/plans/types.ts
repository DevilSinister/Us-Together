export type Plan = {
  id: string; title: string; description: string | null; type: string;
  status: "planned" | "completed" | "cancelled"; starts_at: string; ends_at: string | null;
  originating_timezone: string; location: string | null; budget_minor: number | null;
  latitude: number | null; longitude: number | null; external_map_url: string | null;
  currency: string | null; source_bucket_item_id: string | null; version: number;
};
export type ChecklistItem = { id: string; plan_id: string; label: string; is_completed: boolean; position: number };
export type Reminder = { id: string; plan_id: string; due_at: string; state: string; offset_minutes: number };
export type Attachment = { id: string; plan_id: string; filename: string; mime_type: string; size_bytes: number; ready: boolean };
export type PlanDetail = { plan: Plan; checklist: ChecklistItem[]; reminders: Reminder[]; attachments: Attachment[]; memoryId: string | null };
