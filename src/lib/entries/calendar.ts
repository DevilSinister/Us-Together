import {z} from "zod";
import {addDays} from "@/lib/plans/calendar";
export const sharedCalendarFilter=z.object({date:z.iso.date(),view:z.enum(["month","week"]).default("month"),cursors:z.object({plan:z.object({starts_at:z.iso.datetime({offset:true}),id:z.uuid()}).nullable(),memory:z.object({date:z.iso.date(),id:z.uuid()}).nullable(),moment:z.object({date:z.iso.date(),id:z.uuid()}).nullable()}).optional()});
/** `startsAt` is a plan's instant, so its time can be read in the couple's zone; `location` is what the entry saved. */
export type CalendarEntry={id:string;kind:"plan"|"memory"|"moment";title:string;day:string;endDay:string;href:string;status?:string;startsAt?:string;location?:string|null};
export type SharedCalendarPage={entries:CalendarEntry[];next:NonNullable<z.infer<typeof sharedCalendarFilter>["cursors"]>;timezone:string;paired:boolean;date:string;view:"month"|"week"};
export function entriesOnDay(entries:CalendarEntry[],day:string){return entries.filter(e=>e.day<=day&&e.endDay>=day);}
export type CalendarKind=CalendarEntry["kind"];
export const calendarKinds=["plan","memory","moment"] as const;
// The calendar's three legend chips are also its filters, so "which kinds are
// showing" is a set of independent toggles rather than one exclusive choice.
export function visibleEntries(entries:CalendarEntry[],active:ReadonlySet<CalendarKind>){return entries.filter(e=>active.has(e.kind));}

/** A `?month=` value as "YYYY-MM", or null for anything else, so a bad address falls back to this month. */
export function monthParam(value:unknown):string|null{
 if(typeof value!=="string"||!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))return null;
 const year=Number(value.slice(0,4));
 return year>=1900&&year<=2200?value:null;
}
export function shiftMonth(month:string,delta:number){
 const d=new Date(month+"-01T12:00:00Z");d.setUTCMonth(d.getUTCMonth()+delta);return d.toISOString().slice(0,7);
}
/** How many of each kind touch the month: a trip that starts on the 30th counts in both months it spans. */
export function monthCounts(entries:CalendarEntry[],month:string):Record<CalendarKind,number>{
 const first=month+"-01",last=addDays(shiftMonth(month,1)+"-01",-1);
 const counts:Record<CalendarKind,number>={plan:0,memory:0,moment:0};
 for(const e of entries)if(e.day<=last&&e.endDay>=first)counts[e.kind]++;
 return counts;
}
const nouns:Record<CalendarKind,[string,string]>={plan:["plan","plans"],memory:["memory","memories"],moment:["moment","moments"]};
/** "2 plans, 1 memory, 1 moment", leaving out what the month does not have. */
export function monthLine(counts:Record<CalendarKind,number>){
 const parts=calendarKinds.filter(k=>counts[k]).map(k=>counts[k]+" "+nouns[k][counts[k]===1?0:1]);
 return parts.length?parts.join(", "):"Nothing saved yet";
}
/** The day a month opens on: today when it is in view, else the month's first saved day, else the 1st. */
export function openingDay(entries:CalendarEntry[],month:string,today:string){
 if(today.slice(0,7)===month)return today;
 const first=month+"-01";
 const day=entries.map(e=>e.day<first&&e.endDay>=first?first:e.day).filter(d=>d.slice(0,7)===month).sort()[0];
 return day??first;
}
