import "server-only";
import { z } from "zod";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calendarDays, calendarFilter, addDays, localDate } from "./calendar";
import type { Plan, PlanDetail } from "./types";
export const planColumns = "id,title,description,type,status,starts_at,ends_at,originating_timezone,location,budget_minor,currency,source_bucket_item_id,version,latitude,longitude,external_map_url" as const;
export async function planContext() {
 const identity = await getCurrentIdentity();
 if (!identity) throw new Error("Sign in again to open your plans.");
 if (identity.kind === "developer") {
   const state = await readDeveloperState();
   return { kind: "preview" as const, state, timezone: state.timezone, paired: state.coupleStatus !== "solo" };
 }
 const db = await createServerSupabaseClient();
 const [{data: member,error}, {data: profile}] = await Promise.all([
   db.from("couple_memberships").select("couple_id").eq("user_id",identity.userId).is("left_at",null).maybeSingle(),
   db.from("profiles").select("timezone").eq("user_id",identity.userId).maybeSingle()
 ]);
 if (error) throw new Error("We couldn't open your shared space. Try again.");
 return {kind:"database" as const, db, userId:identity.userId,coupleId:member?.couple_id,paired:!!member,timezone:profile?.timezone ?? "UTC"};
}
export function previewPlans(state: Awaited<ReturnType<typeof readDeveloperState>>): Plan[] {
 return state.plans.map(p=>({id:p.id,title:p.title,description:p.description,type:p.type,status:p.status,starts_at:p.startsAt,ends_at:p.endsAt,originating_timezone:p.timezone,location:p.location,budget_minor:p.budgetMinor ?? null,currency:p.currency ?? null,source_bucket_item_id:p.sourceBucketId ?? null,version:p.version ?? 1,latitude:p.latitude ?? null,longitude:p.longitude ?? null,external_map_url:p.mapUrl ?? null}));
}
export async function loadPlans(input: unknown) {
 const filter=calendarFilter.parse(input), context=await planContext();
 const anchor=filter.date ?? localDate(new Date(),context.timezone);
 const days=filter.view==="upcoming" ? [] : calendarDays(filter.view,anchor);
 const rangeStart=days.length ? days[0] : anchor;
 const rangeEnd=days.length ? addDays(days.at(-1)!,1) : null;
 // Expand UTC bounds to include all IANA offsets, then classify exact viewer dates.
 const from=new Date(Date.parse(rangeStart+"T00:00:00Z")-86400000).toISOString();
 const until=rangeEnd ? new Date(Date.parse(rangeEnd+"T00:00:00Z")+86400000).toISOString() : null;
 const limit=filter.view==="upcoming"?30:250;
 let rows:Plan[]=[];
 if(context.kind==="preview") rows=previewPlans(context.state).filter(p => (filter.status==="all"||p.status===filter.status) && (!filter.cursor||p.starts_at>filter.cursor.starts_at||(p.starts_at===filter.cursor.starts_at&&p.id>filter.cursor.id))).sort((a,b)=>a.starts_at.localeCompare(b.starts_at)||a.id.localeCompare(b.id));
 else if(context.coupleId) {
   let q=context.db.from("plans").select(planColumns).eq("couple_id",context.coupleId).order("starts_at").order("id").limit(limit+1);
   if(filter.status!=="all") q=q.eq("status",filter.status);
   if(filter.view!=="upcoming") {q=q.lt("starts_at",until!).or("ends_at.gte."+from+",and(ends_at.is.null,starts_at.gte."+from+")");}
   else if(filter.status==="planned") q=q.or("starts_at.gte."+from+",ends_at.gte."+from);
   if(filter.cursor) q=q.or("starts_at.gt."+filter.cursor.starts_at+",and(starts_at.eq."+filter.cursor.starts_at+",id.gt."+filter.cursor.id+")");
   const {data,error}=await q;
   if(error) throw new Error("We couldn't load your plans. Try again.");
   rows=data.map(p=>({...p,status:z.enum(["planned","completed","cancelled"]).parse(p.status)}));
 }
 const rawMore=rows.length>limit; const rawPage=rows.slice(0,limit); const rawLast=rawPage.at(-1);
 rows=rawPage;
 rows=rows.filter(p=>(filter.status==="all"||p.status===filter.status)).sort((a,b)=>a.starts_at.localeCompare(b.starts_at)||a.id.localeCompare(b.id));
 if(context.kind==="preview" && filter.cursor) rows=rows.filter(p=>p.starts_at>filter.cursor!.starts_at||(p.starts_at===filter.cursor!.starts_at&&p.id>filter.cursor!.id));
 if(filter.view!=="upcoming") rows=rows.filter(p=>localDate(p.starts_at,context.timezone)<rangeEnd! && localDate(p.ends_at ?? p.starts_at,context.timezone)>=rangeStart);
 else if(filter.status==="planned") rows=rows.filter(p=>localDate(p.ends_at ?? p.starts_at,context.timezone)>=anchor);
 const hasMore=rawMore; const plans=rows; const last=rawLast;
 return {plans,hasMore,next:hasMore&&last?{starts_at:last.starts_at,id:last.id}:null,timezone:context.timezone,paired:context.paired,anchor};
}
export async function loadPlan(id:string):Promise<PlanDetail|null> {
 if(!z.uuid().safeParse(id).success) return null;
 const c=await planContext();
 if(!c.paired) return null;
 if(c.kind==="preview") {
   const plan=previewPlans(c.state).find(p=>p.id===id);
   if(!plan)return null;
   return {plan,checklist:(c.state.planChecklist??[]).filter(t=>t.plan_id===id).sort((a,b)=>a.position-b.position),reminders:(c.state.planReminders??[]).filter(r=>r.plan_id===id),attachments:[],memoryId:c.state.memories.find(m=>m.sourcePlanId===id)?.id ?? null};
 }
 const {data:plan,error}=await c.db.from("plans").select(planColumns).eq("id",id).eq("couple_id",c.coupleId!).maybeSingle();
 if(error)throw new Error("We couldn't load this plan. Try again.");
 if(!plan)return null;
 const [tasks,reminders,attachments,memory]=await Promise.all([
 c.db.from("plan_checklist_items").select("id,plan_id,label,is_completed,position").eq("plan_id",id).order("position").limit(50),
 c.db.from("plan_reminders").select("id,plan_id,due_at,state,offset_minutes").eq("plan_id",id).order("due_at").limit(5),
 c.db.from("plan_attachments").select("id,plan_id,filename,mime_type,size_bytes,ready").eq("plan_id",id).order("created_at").limit(20),
 c.db.from("memories").select("id").eq("source_plan_id",id).maybeSingle()
 ]);
 if(tasks.error||reminders.error||attachments.error||memory.error)throw new Error("We couldn't load all the plan details. Try again.");
 return {plan:{...plan,status:z.enum(["planned","completed","cancelled"]).parse(plan.status)},checklist:tasks.data,reminders:reminders.data,attachments:attachments.data,memoryId:memory.data?.id??null};
}

/** A plan on the Plans list, with the memory it became when one was kept from it. */
export type PlanListRow = Plan & { memoryId: string | null };
export type PlanList = {
  paired: boolean; timezone: string; today: string;
  /** Planned and not yet over, soonest first; at most one page. */
  upcoming: Plan[]; upcomingMore: boolean;
  /** Still planned, but every day of it has passed: waiting to be marked kept or cancelled. Newest first. */
  unmarked: Plan[];
  /** Completed, newest first. */
  kept: PlanListRow[]; keptCount: number;
  cancelled: Plan[]; cancelledCount: number;
};

const keptPage = 20, allKept = 200;

/**
 * The Plans screen in one read: what is coming up (the same window and page
 * as the upcoming view), what was kept and the memory each became, and how
 * many were cancelled. Cancelled plans are listed only when asked for.
 */
export async function loadPlanList({ showCancelled = false, allKept: everyKept = false } = {}): Promise<PlanList> {
  const c = await planContext();
  const today = localDate(new Date(), c.timezone);
  const empty: PlanList = { paired: c.paired, timezone: c.timezone, today, upcoming: [], upcomingMore: false, unmarked: [], kept: [], keptCount: 0, cancelled: [], cancelledCount: 0 };
  if (!c.paired) return empty;
  const keptLimit = everyKept ? allKept : keptPage;
  const newestFirst = (a: Plan, b: Plan) => b.starts_at.localeCompare(a.starts_at) || b.id.localeCompare(a.id);
  const over = (p: Plan) => localDate(p.ends_at && p.ends_at > p.starts_at ? new Date(Date.parse(p.ends_at) - 1) : p.starts_at, c.timezone) < today;

  if (c.kind === "preview") {
    const all = previewPlans(c.state);
    const upcoming = await loadPlans({ view: "upcoming", status: "planned" });
    const kept = all.filter(p => p.status === "completed").sort(newestFirst);
    const cancelled = all.filter(p => p.status === "cancelled").sort(newestFirst);
    return {
      ...empty,
      upcoming: upcoming.plans, upcomingMore: upcoming.hasMore,
      unmarked: all.filter(p => p.status === "planned" && over(p)).sort(newestFirst).slice(0, keptPage),
      kept: kept.slice(0, keptLimit).map(p => ({ ...p, memoryId: c.state.memories.find(m => m.sourcePlanId === p.id)?.id ?? null })), keptCount: kept.length,
      cancelled: showCancelled ? cancelled.slice(0, keptPage) : [], cancelledCount: cancelled.length,
    };
  }
  if (!c.coupleId) return empty;

  const status = z.enum(["planned", "completed", "cancelled"]);
  const [upcoming, unmarked, kept, cancelled] = await Promise.all([
    loadPlans({ view: "upcoming", status: "planned" }),
    c.db.from("plans").select(planColumns).eq("couple_id", c.coupleId).eq("status", "planned").lt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: false }).order("id", { ascending: false }).limit(keptPage),
    c.db.from("plans").select(planColumns, { count: "exact" }).eq("couple_id", c.coupleId).eq("status", "completed")
      .order("starts_at", { ascending: false }).order("id", { ascending: false }).limit(keptLimit),
    showCancelled
      ? c.db.from("plans").select(planColumns, { count: "exact" }).eq("couple_id", c.coupleId).eq("status", "cancelled")
        .order("starts_at", { ascending: false }).order("id", { ascending: false }).limit(keptPage)
      : c.db.from("plans").select("id", { count: "exact", head: true }).eq("couple_id", c.coupleId).eq("status", "cancelled"),
  ]);
  if (unmarked.error || kept.error || cancelled.error) throw new Error("We couldn't load your plans. Try again.");
  const keptRows = (kept.data ?? []).map(p => ({ ...p, status: status.parse(p.status) }));
  const ids = keptRows.map(p => p.id);
  const memories = ids.length
    ? await c.db.from("memories").select("id,source_plan_id").eq("couple_id", c.coupleId).in("source_plan_id", ids)
    : { data: [] as { id: string; source_plan_id: string | null }[], error: null };
  if (memories.error) throw new Error("We couldn't load your plans. Try again.");
  const memoryOf = new Map((memories.data ?? []).map(m => [m.source_plan_id, m.id]));
  const cancelledRows = showCancelled && "data" in cancelled && Array.isArray(cancelled.data)
    ? (cancelled.data as Plan[]).map(p => ({ ...p, status: status.parse(p.status) }))
    : [];

  return {
    ...empty,
    upcoming: upcoming.plans, upcomingMore: upcoming.hasMore,
    unmarked: (unmarked.data ?? []).map(p => ({ ...p, status: status.parse(p.status) })).filter(over),
    kept: keptRows.map(p => ({ ...p, memoryId: memoryOf.get(p.id) ?? null })), keptCount: kept.count ?? keptRows.length,
    cancelled: cancelledRows, cancelledCount: cancelled.count ?? cancelledRows.length,
  };
}
