import {describe,it,expect} from "vitest";
import {entriesOnDay,visibleEntries,calendarKinds,sharedCalendarFilter,monthParam,shiftMonth,monthCounts,monthLine,openingDay,type CalendarEntry,type CalendarKind} from "./calendar";
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

describe("calendar months",()=>{
 const e=(id:string,kind:CalendarKind,day:string,endDay=day):CalendarEntry=>({id,kind,day,endDay,title:id,href:"/"+id});
 it("accepts only a real YYYY-MM month from the address",()=>{
  expect(monthParam("2026-11")).toBe("2026-11");
  for(const bad of ["2026-13","2026-1","26-11","2026-11-01",["2026-11"],undefined,"0001-01"])expect(monthParam(bad)).toBeNull();
 });
 it("steps across years",()=>{expect(shiftMonth("2026-12",1)).toBe("2027-01");expect(shiftMonth("2026-01",-1)).toBe("2025-12");});
 it("counts what touches the month, including a trip that starts before it, and leaves out trailing days",()=>{
  const entries=[e("a","plan","2026-10-30","2026-11-02"),e("b","plan","2026-11-14"),e("c","memory","2026-11-02"),e("d","moment","2026-12-01"),e("f","memory","2026-10-28")];
  const counts=monthCounts(entries,"2026-11");
  expect(counts).toEqual({plan:2,memory:1,moment:0});
  expect(monthLine(counts)).toBe("2 plans, 1 memory");
  expect(monthLine({plan:0,memory:0,moment:0})).toBe("Nothing saved yet");
 });
 it("opens on today in this month, else the first saved day, else the 1st",()=>{
  const entries=[e("a","plan","2026-12-20"),e("b","memory","2026-12-05"),e("c","plan","2026-11-29","2026-12-02")];
  expect(openingDay(entries,"2026-11","2026-11-12")).toBe("2026-11-12");
  expect(openingDay(entries,"2026-12","2026-11-12")).toBe("2026-12-01");
  expect(openingDay([e("b","memory","2026-12-05")],"2026-12","2026-11-12")).toBe("2026-12-05");
  expect(openingDay([],"2027-02","2026-11-12")).toBe("2027-02-01");
 });
});
