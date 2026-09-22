import {describe,it,expect} from "vitest";
import {entriesOnDay,visibleEntries,calendarKinds,sharedCalendarFilter,type CalendarEntry,type CalendarKind} from "./calendar";
import {photonPlaces} from "./location";
import {milestoneSchema} from "@/lib/dashboard/schema";
describe("shared entry boundaries",()=>{
 it("includes all three kinds and multi-day plans on a selected day",()=>{
 const entries:CalendarEntry[]=[{id:"p",kind:"plan",day:"2026-09-01",endDay:"2026-09-03",title:"Trip",href:"/plans/p"},{id:"m",kind:"memory",day:"2026-09-02",endDay:"2026-09-02",title:"Photo",href:"/memories/m"},{id:"o",kind:"moment",day:"2026-09-02",endDay:"2026-09-02",title:"Anniversary",href:"/milestones/o"}];
 expect(entriesOnDay(entries,"2026-09-02").map(x=>x.kind)).toEqual(["plan","memory","moment"]);expect(entriesOnDay(entries,"2026-09-04")).toEqual([]);
 });
 it("rejects impossible dates and malformed cursors",()=>{expect(sharedCalendarFilter.safeParse({date:"2026-02-30"}).success).toBe(false);expect(sharedCalendarFilter.safeParse({date:"2026-09-02",cursors:{memory:{date:"2026-09-02",id:"x"},plan:null,moment:null}}).success).toBe(false);expect(milestoneSchema.safeParse({title:"Day",type:"custom",milestoneDate:"2026-02-30"}).success).toBe(false);});
 it("normalizes free place suggestions without persisting coordinates",()=>{expect(photonPlaces({features:[{properties:{osm_id:1,name:"Karachi",city:"Karachi",country:"Pakistan"},geometry:{coordinates:[67,24]}}]})).toEqual([{id:"place1",label:"Karachi, Pakistan"}]);expect(()=>photonPlaces({features:"invalid"})).toThrow();});
});

describe("calendar legend filters",()=>{
 const entries:CalendarEntry[]=[
  {id:"p",kind:"plan",day:"2026-09-02",endDay:"2026-09-02",title:"Trip",href:"/plans/p"},
  {id:"m",kind:"memory",day:"2026-09-02",endDay:"2026-09-02",title:"Photo",href:"/memories/m"},
  {id:"o",kind:"moment",day:"2026-09-02",endDay:"2026-09-02",title:"Anniversary",href:"/milestones/o"},
 ];
 it("shows every kind when all three chips are on",()=>{
  expect(visibleEntries(entries,new Set(calendarKinds))).toHaveLength(3);
 });
 it("toggles kinds independently rather than as one exclusive choice",()=>{
  const two=new Set<CalendarKind>(["plan","moment"]);
  expect(visibleEntries(entries,two).map(e=>e.kind)).toEqual(["plan","moment"]);
 });
 it("shows nothing when every chip is off, so the empty state is reachable",()=>{
  expect(visibleEntries(entries,new Set<CalendarKind>())).toEqual([]);
 });
 it("names exactly the three kinds the markers encode",()=>{
  expect([...calendarKinds]).toEqual(["plan","memory","moment"]);
 });
});
