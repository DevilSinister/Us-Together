import {z} from "zod";
export const sharedCalendarFilter=z.object({date:z.iso.date(),view:z.enum(["month","week"]).default("month"),cursors:z.object({plan:z.object({starts_at:z.iso.datetime({offset:true}),id:z.uuid()}).nullable(),memory:z.object({date:z.iso.date(),id:z.uuid()}).nullable(),moment:z.object({date:z.iso.date(),id:z.uuid()}).nullable()}).optional()});
export type CalendarEntry={id:string;kind:"plan"|"memory"|"moment";title:string;day:string;endDay:string;href:string;status?:string};
export type SharedCalendarPage={entries:CalendarEntry[];next:NonNullable<z.infer<typeof sharedCalendarFilter>["cursors"]>;timezone:string;paired:boolean;date:string;view:"month"|"week"};
export function entriesOnDay(entries:CalendarEntry[],day:string){return entries.filter(e=>e.day<=day&&e.endDay>=day);}
