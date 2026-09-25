"use client";
import {useCallback,useEffect,useId,useLayoutEffect,useRef,useState} from "react";
import Link from "next/link";
import {ArrowUpRight,ChevronLeft,ChevronRight,ChevronUp,Download,ImageOff,Images,MoreVertical,Pencil,Trash2,X} from "lucide-react";
import type {GalleryItem} from "@/lib/entries/gallery";
import {mediaHref,type MediaVariant} from "@/lib/entries/media-url";
import {memoryMediaAction} from "@/app/actions/memories";
import {changePreviewMedia} from "@/lib/entries/preview-media";
import {clampPan,crossesEntry,MAX_SCALE,resist,swipeStep,verticalIntent,zoomAbout} from "@/lib/entries/viewer";
import {Button} from "@/components/ui/button";
import {ConfirmDelete} from "@/components/ui/confirm-delete";
import {Label} from "@/components/ui/label";
import {cn} from "@/lib/utils";
import {CommentThread} from "./comment-thread";

// Preview mode holds blob URLs on the item itself; everything else is addressed
// by the shared route builder so no two surfaces can drift on the query shape.
export function mediaSource(item:GalleryItem,variant:MediaVariant="original"){return (variant==="preview"?item.previewUrl:item.url)??mediaHref(item.id,item.access.kind,variant);}

const GAP=24;
const SETTLE_MS=260;
const dateFormat=new Intl.DateTimeFormat("en",{dateStyle:"long",timeZone:"UTC"});
const entryLabel=(item:GalleryItem)=>item.entryTitle||(item.access.kind==="memory"?"A memory":"A moment");
const entryHref=(item:GalleryItem)=>(item.access.kind==="memory"?"/memories/":"/milestones/")+item.access.id;

type Pointer={x:number;y:number};
// Capture can throw for a pointer the browser has already released; a gesture
// must never die on that.
const capture=(el:Element,id:number)=>{try{if(!el.hasPointerCapture(id))el.setPointerCapture(id);}catch{}};
type Gesture={start:Pointer;at:number;axis:"x"|"y"|null;pan:Pointer;pinch:{distance:number;scale:number}|null;moved:boolean};

/**
 * A photo, full screen, the way a phone shows one.
 *
 * The picture fills a black stage and nothing else competes with it. Swipe
 * sideways for the next file; the neighbours are already mounted either side,
 * so the one you are pulling in follows your finger. Pinch or double-tap to
 * zoom. Swipe up for the comments, pull down to put the photo away.
 *
 * Tapping the photo shows the top bar: close, where this file came from, and a
 * three-dot menu holding Edit caption, Download and Delete. The bottom only
 * ever carries the caption and the way into the comments. When a swipe steps
 * into a different memory or moment, its title rises briefly at the top, so a
 * gallery that spans many memories never loses its place.
 *
 * Settling after a swipe is timed rather than waiting on `transitionend`: a
 * backgrounded tab never finishes a transition, and a viewer that waits on one
 * would freeze mid-swipe.
 */
export function MediaViewer({items,index,onIndex,onClose,onChange}:{items:GalleryItem[];index:number;onIndex:(i:number)=>void;onClose:()=>void;onChange:()=>Promise<void>}){
 const dialog=useRef<HTMLDialogElement>(null),stage=useRef<HTMLDivElement>(null),commentsButton=useRef<HTMLButtonElement>(null);
 const item=items[index];
 const [size,setSize]=useState({width:0,height:0});
 const [chrome,setChrome]=useState(false);
 const [menu,setMenu]=useState(false);
 const [sheet,setSheet]=useState<null|"comments"|"caption">(null);
 const [confirming,setConfirming]=useState(false);
 const [drag,setDrag]=useState({x:0,y:0});
 const [settling,setSettling]=useState(false);
 const [zoom,setZoom]=useState({scale:1,x:0,y:0});
 const [touching,setTouching]=useState(false);
 const [chapter,setChapter]=useState<{key:number;title:string;date:string}|null>(null);
 const pointers=useRef(new Map<number,Pointer>()),gesture=useRef<Gesture|null>(null),lastTap=useRef<{at:number;x:number;y:number}|null>(null),tapTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),settleTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),idle=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const previous=useRef<GalleryItem|undefined>(undefined);
 const reduced=useRef(false);

 useEffect(()=>{
  dialog.current?.showModal();
  // showModal focuses the first control, which is the hidden Close button, and
  // focus inside the top bar reveals it. The photo takes focus instead, so the
  // bar stays out of the way until a tap, a mouse move or a Tab asks for it.
  stage.current?.focus({preventScroll:true});
  reduced.current=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // A modal dialog makes the page inert but not still: phones keep scrolling it.
  const root=document.documentElement,overflow=root.style.overflow;root.style.overflow="hidden";
  return()=>{root.style.overflow=overflow;clearTimeout(tapTimer.current);clearTimeout(settleTimer.current);clearTimeout(idle.current);};
 },[]);

 useLayoutEffect(()=>{const el=stage.current;if(!el)return;const o=new ResizeObserver(([e])=>setSize({width:e.contentRect.width,height:e.contentRect.height}));o.observe(el);return()=>o.disconnect();},[]);

 // The memory's title rises at the top on open, and again whenever a swipe
 // crosses into a different memory or moment.
 useEffect(()=>{
  if(!item)return;
  const crossed=!previous.current||crossesEntry(previous.current,item);
  previous.current=item;
  if(!crossed)return;
  const shown={key:Date.now(),title:entryLabel(item),date:item.entryDate};
  const show=setTimeout(()=>setChapter(shown),0),hide=setTimeout(()=>setChapter(c=>c?.key===shown.key?null:c),2600);
  return()=>{clearTimeout(show);clearTimeout(hide);};
 },[item]);

 // Deleting the last file, or a refresh that removes it, leaves nothing to show.
 useEffect(()=>{if(!item)onClose();},[item,onClose]);

 const go=useCallback((step:-1|1)=>{
  const target=index+step;
  if(target<0||target>=items.length||settling)return;
  setMenu(false);
  if(reduced.current||!size.width){onIndex(target);setZoom({scale:1,x:0,y:0});return;}
  setSettling(true);setDrag({x:-step*(size.width+GAP),y:0});
  clearTimeout(settleTimer.current);
  settleTimer.current=setTimeout(()=>{onIndex(target);setZoom({scale:1,x:0,y:0});setDrag({x:0,y:0});setSettling(false);},SETTLE_MS);
 },[index,items.length,onIndex,settling,size.width]);

 function snapBack(){
  if(reduced.current){setDrag({x:0,y:0});return;}
  setSettling(true);setDrag({x:0,y:0});
  clearTimeout(settleTimer.current);settleTimer.current=setTimeout(()=>setSettling(false),SETTLE_MS);
 }

 function openSheet(kind:"comments"|"caption"){setMenu(false);setSheet(kind);}
 function closeSheet(){setSheet(null);setTimeout(()=>commentsButton.current?.focus(),0);}

 function spread(){const [a,b]=[...pointers.current.values()];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;}

 function tap(point:Pointer){
  const now=Date.now(),last=lastTap.current;
  if(item?.media_type==="image"&&last&&now-last.at<300&&Math.hypot(point.x-last.x,point.y-last.y)<40){
   // Double tap: zoom into the spot you tapped, or back out.
   clearTimeout(tapTimer.current);lastTap.current=null;
   const rect=stage.current?.getBoundingClientRect();if(!rect)return;
   const center={x:rect.width/2,y:rect.height/2},local={x:point.x-rect.left,y:point.y-rect.top};
   setZoom(z=>z.scale>1?{scale:1,x:0,y:0}:{scale:2.5,...zoomAbout(2.5,local,center)});
   return;
  }
  lastTap.current={at:now,...point};
  clearTimeout(tapTimer.current);
  tapTimer.current=setTimeout(()=>{if(menu)setMenu(false);else setChrome(c=>!c);},item?.media_type==="image"?260:0);
 }

 const onPointerDown=(e:React.PointerEvent<HTMLDivElement>)=>{
  if(sheet||settling||e.button>0)return;
  const target=e.target as HTMLElement;
  // The lower strip of a playing video belongs to its own controls, and a tap
  // anywhere on it must still reach the video, so capture waits for a swipe.
  if(target.tagName==="VIDEO"&&e.clientY>target.getBoundingClientRect().bottom-64)return;
  if(target.tagName!=="VIDEO")capture(e.currentTarget,e.pointerId);
  setTouching(true);
  pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.current.size===2&&item?.media_type==="image"){gesture.current={start:{x:e.clientX,y:e.clientY},at:Date.now(),axis:null,pan:{x:zoom.x,y:zoom.y},pinch:{distance:spread(),scale:zoom.scale},moved:true};setDrag({x:0,y:0});return;}
  if(pointers.current.size===1)gesture.current={start:{x:e.clientX,y:e.clientY},at:Date.now(),axis:null,pan:{x:zoom.x,y:zoom.y},pinch:null,moved:false};
 };

 const onPointerMove=(e:React.PointerEvent<HTMLDivElement>)=>{
  if(e.pointerType==="mouse"&&!pointers.current.size){setChrome(true);clearTimeout(idle.current);idle.current=setTimeout(()=>setChrome(c=>menu||sheet?c:false),2500);return;}
  const g=gesture.current;if(!g||!pointers.current.has(e.pointerId))return;
  pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(g.pinch&&pointers.current.size>1){
   const scale=Math.min(MAX_SCALE,Math.max(1,g.pinch.scale*spread()/g.pinch.distance));
   setZoom(z=>scale===1?{scale:1,x:0,y:0}:{scale,...clampPan(z,scale,size.width,size.height)});
   return;
  }
  const dx=e.clientX-g.start.x,dy=e.clientY-g.start.y;
  if(!g.moved&&Math.hypot(dx,dy)<10)return;
  if(!g.moved)capture(e.currentTarget,e.pointerId);
  g.moved=true;
  if(zoom.scale>1){setZoom(z=>({...z,...clampPan({x:g.pan.x+dx,y:g.pan.y+dy},z.scale,size.width,size.height)}));return;}
  g.axis??=Math.abs(dx)>Math.abs(dy)?"x":"y";
  setDrag(g.axis==="x"?{x:resist(dx,index,items.length),y:0}:{x:0,y:dy>0?dy:dy*0.35});
 };

 const onPointerUp=(e:React.PointerEvent<HTMLDivElement>)=>{
  if(!pointers.current.has(e.pointerId))return;
  pointers.current.delete(e.pointerId);
  if(!pointers.current.size)setTouching(false);
  const g=gesture.current;
  if(!g)return;
  if(g.pinch){
   // Lifting one finger of a pinch hands the other a fresh pan from where it is.
   const [rest]=[...pointers.current.values()];
   gesture.current=rest?{start:rest,at:Date.now(),axis:null,pan:{x:zoom.x,y:zoom.y},pinch:null,moved:true}:null;
   return;
  }
  gesture.current=null;
  const dx=e.clientX-g.start.x,dy=e.clientY-g.start.y;
  if(!g.moved){tap({x:e.clientX,y:e.clientY});return;}
  if(zoom.scale>1)return;
  if(g.axis==="x"){const step=swipeStep({dx,ms:Date.now()-g.at,width:size.width,index,count:items.length});if(step)go(step);else snapBack();return;}
  const intent=verticalIntent(dy);
  if(intent==="close"){onClose();return;}
  snapBack();
  if(intent==="comments")openSheet("comments");
 };

 const onPointerCancel=(e:React.PointerEvent<HTMLDivElement>)=>{pointers.current.delete(e.pointerId);if(!pointers.current.size){setTouching(false);gesture.current=null;if(zoom.scale===1)snapBack();}};

 if(!item)return null;
 const neighbours=[index-1,index,index+1].filter(i=>i>=0&&i<items.length);
 const pull=drag.y>0?Math.min(1,drag.y/400):0;
 const arrow="absolute top-1/2 z-20 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-opacity hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-white pointer-fine:grid motion-reduce:transition-none";

 return <dialog
  ref={dialog}
  aria-label={"Photo viewer, "+entryLabel(item)}
  onCancel={e=>{e.preventDefault();if(confirming)return;if(menu){setMenu(false);return;}if(sheet){closeSheet();return;}onClose();}}
  onKeyDown={e=>{
   if(e.target instanceof Element&&e.target.closest("video,input,textarea,select,[role=menu]"))return;
   if(e.key==="ArrowLeft"){e.preventDefault();go(-1);}
   else if(e.key==="ArrowRight"){e.preventDefault();go(1);}
   else if(e.key==="Tab")setChrome(true);
  }}
  className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-white backdrop:bg-black"
 >
  <div className="absolute inset-0 bg-black" style={{opacity:1-pull*0.8}} aria-hidden="true"/>
  {/* Each slide is a flex box, not a grid: a percentage max-height resolves
      against a flex container's definite height, but not against an auto grid
      row, where a square photo on a wide screen would overflow the screen. */}

  {/* The stage: every gesture lands here. touch-action none hands pinch and pan to us. */}
  <div
   ref={stage}
   tabIndex={-1}
   className="absolute inset-0 touch-none select-none overflow-hidden outline-none"
   onPointerDown={onPointerDown}
   onPointerMove={onPointerMove}
   onPointerUp={onPointerUp}
   onPointerCancel={onPointerCancel}
  >
   {neighbours.map(i=>{
    const offset=(i-index)*(size.width+GAP)+drag.x;
    const current=i===index;
    return <div
     key={items[i].sortKey}
     aria-hidden={current?undefined:"true"}
     className={cn("absolute inset-0 flex items-center justify-center",settling&&"transition-transform duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none")}
     style={{transform:`translate3d(${offset}px,${current?drag.y:0}px,0)`}}
    >
     <Slide item={items[i]} current={current} zoom={current?zoom:{scale:1,x:0,y:0}} animateZoom={!touching}/>
    </div>;
   })}
  </div>

  {/* Where you are, rising briefly whenever a swipe crosses into another memory. */}
  <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-[max(4.75rem,calc(env(safe-area-inset-top)+4.25rem))] z-20 flex justify-center px-4">
   {chapter?<p key={chapter.key} className="viewer-chapter flex max-w-full items-center gap-2.5 rounded-panel bg-black/55 px-3.5 py-2 text-white backdrop-blur-md">
    <Images className="size-4 shrink-0 text-white/75" aria-hidden="true"/>
    <span className="min-w-0"><span className="sr-only">Now viewing </span><span className="block truncate font-display text-lg leading-tight">{chapter.title}</span>{chapter.date?<span className="block text-xs text-white/70">{dateFormat.format(new Date(chapter.date+"T00:00:00Z"))}</span>:null}</span>
   </p>:null}
  </div>

  {/* Top bar: shown on tap, on mouse movement, and whenever focus is inside it. Hidden, it takes no taps. */}
  <div className={cn(
   "absolute inset-x-0 top-0 z-30 flex items-start gap-1 bg-gradient-to-b from-black/75 via-black/35 to-transparent px-2 pb-10 pt-[max(0.5rem,env(safe-area-inset-top))] transition-opacity duration-200 motion-reduce:transition-none",
   chrome||menu?"opacity-100":"pointer-events-none opacity-0 focus-within:pointer-events-auto focus-within:opacity-100",
  )}>
   <button type="button" onClick={onClose} aria-label="Close photo" className="grid size-11 shrink-0 place-items-center rounded-control hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"><X className="size-6" aria-hidden="true"/></button>
   <div className="min-w-0 flex-1 py-1">
    <Link href={entryHref(item)} className="block truncate font-display text-lg leading-tight hover:underline focus-visible:outline-2 focus-visible:outline-white">{entryLabel(item)}</Link>
    <p className="text-xs text-white/70">{index+1} of {items.length}{item.entryDate?" · "+dateFormat.format(new Date(item.entryDate+"T00:00:00Z")):""}</p>
   </div>
   <ViewerMenu open={menu} onOpenChange={setMenu} item={item} onCaption={()=>openSheet("caption")} onDelete={()=>{setMenu(false);setConfirming(true);}}/>
  </div>

  {/* Pointer users get visible arrows; touch users swipe. */}
  {index>0?<button type="button" onClick={()=>go(-1)} aria-label="Previous photo" className={cn(arrow,"left-3",chrome?"opacity-100":"pointer-events-none opacity-0 focus-visible:pointer-events-auto focus-visible:opacity-100")}><ChevronLeft className="size-6" aria-hidden="true"/></button>:null}
  {index<items.length-1?<button type="button" onClick={()=>go(1)} aria-label="Next photo" className={cn(arrow,"right-3",chrome?"opacity-100":"pointer-events-none opacity-0 focus-visible:pointer-events-auto focus-visible:opacity-100")}><ChevronRight className="size-6" aria-hidden="true"/></button>:null}

  {/* The bottom carries only the caption and the way up into the comments. */}
  {!sheet?<div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-14" style={{opacity:1-pull}}>
   <div className="mx-auto max-w-2xl">
    {item.caption?<p className="line-clamp-3 whitespace-pre-wrap break-words text-[0.95rem] leading-6 text-white/95">{item.caption}</p>:null}
    <button ref={commentsButton} type="button" onClick={()=>openSheet("comments")} className="pointer-events-auto mx-auto mt-1 flex min-h-11 flex-col items-center justify-center px-6 text-sm font-semibold text-white/85 hover:text-white focus-visible:outline-2 focus-visible:outline-white">
     <ChevronUp className="size-5" aria-hidden="true"/>Comments
    </button>
   </div>
  </div>:null}

  {sheet?<Sheet
   kind={sheet}
   item={item}
   onClose={closeSheet}
   onEditCaption={()=>setSheet("caption")}
   onSaved={async()=>{await onChange();setSheet("comments");}}
  />:null}

  <ConfirmDelete
   trigger={false}
   open={confirming}
   onOpenChange={setConfirming}
   label="Delete"
   confirmLabel={item.media_type==="video"?"Delete video":"Delete photo"}
   title={item.media_type==="video"?"Delete this video?":"Delete this photo?"}
   description="It is removed for both of you, along with every comment on it."
   onConfirm={async()=>{
    try{
     if(item.access.previewSession)await changePreviewMedia(item.access,item.id,undefined);
     else{const r=await memoryMediaAction({operation:"remove",kind:item.access.kind,memoryId:item.access.id,id:item.id});if(r.error)return r.error;}
    }catch(e){return e instanceof Error?e.message:"We could not delete this file. Try again.";}
    // Land on a neighbour, as a photo app does; the last file closes the viewer.
    if(items.length<2)onClose();else onIndex(index<items.length-1?index+1:index-1);
    await onChange();
   }}
  />
 </dialog>;
}

/** One file on the stage. Only the current one is interactive; neighbours are previews in waiting. */
function Slide({item,current,zoom,animateZoom}:{item:GalleryItem;current:boolean;zoom:{scale:number;x:number;y:number};animateZoom:boolean}){
 const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
 if(item.media_type!=="image")return current
  ?<video key={item.id} controls playsInline preload="metadata" className="max-h-full max-w-full" src={mediaSource(item)} aria-label={item.caption||"Video"}><track kind="captions"/></video>
  :<video key={item.id} muted playsInline preload="metadata" className="pointer-events-none max-h-full max-w-full" src={mediaSource(item)} tabIndex={-1}/>;
 if(status==="error")return <p className="flex flex-col items-center gap-2 px-6 text-center text-sm text-white/75"><ImageOff className="size-7" aria-hidden="true"/>This photo could not be opened.</p>;
 return <>
  {status==="loading"?<span aria-hidden="true" className="absolute size-8 animate-spin rounded-full border-2 border-white/25 border-t-white/80 motion-reduce:animate-none"/>:null}
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img
   src={mediaSource(item)}
   alt={current?item.caption||"Photo":""}
   draggable={false}
   referrerPolicy="no-referrer"
   decoding="async"
   onLoad={()=>setStatus("ready")}
   onError={()=>setStatus("error")}
   className={cn("max-h-full max-w-full object-contain",status==="ready"?"opacity-100":"opacity-0",animateZoom&&"transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none")}
   style={{transform:`translate3d(${zoom.x}px,${zoom.y}px,0) scale(${zoom.scale})`}}
  />
 </>;
}

/** The three-dot menu. Arrow keys move between items; Escape and an outside tap close it. */
function ViewerMenu({open,onOpenChange,item,onCaption,onDelete}:{open:boolean;onOpenChange:(open:boolean)=>void;item:GalleryItem;onCaption:()=>void;onDelete:()=>void}){
 const list=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null),id=useId();
 useEffect(()=>{
  if(!open)return;
  list.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  const away=(e:PointerEvent)=>{if(!list.current?.contains(e.target as Node)&&!button.current?.contains(e.target as Node))onOpenChange(false);};
  document.addEventListener("pointerdown",away,true);
  return()=>document.removeEventListener("pointerdown",away,true);
 },[open,onOpenChange]);
 const row="flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm font-semibold hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none";
 return <div className="relative shrink-0">
  <button ref={button} type="button" aria-label="More options" aria-haspopup="menu" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>onOpenChange(!open)} className="grid size-11 place-items-center rounded-control hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"><MoreVertical className="size-6" aria-hidden="true"/></button>
  {open?<div
   ref={list}
   id={id}
   role="menu"
   aria-label="Photo options"
   onKeyDown={e=>{
    const rows=[...(list.current?.querySelectorAll<HTMLElement>("[role=menuitem]")??[])],at=rows.indexOf(document.activeElement as HTMLElement);
    if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();rows[(at+(e.key==="ArrowDown"?1:rows.length-1))%rows.length]?.focus();}
    if(e.key==="Escape"){e.preventDefault();e.stopPropagation();onOpenChange(false);button.current?.focus();}
    if(e.key==="Tab")onOpenChange(false);
   }}
   className="absolute right-0 top-12 w-60 overflow-hidden rounded-panel border bg-card py-1.5 text-foreground shadow-paper"
  >
   <button type="button" role="menuitem" onClick={onCaption} className={row}><Pencil className="size-4 text-muted-foreground" aria-hidden="true"/>{item.caption?"Edit caption":"Add a caption"}</button>
   <a role="menuitem" href={mediaSource(item,"download")} download={item.access.previewSession?"download":undefined} referrerPolicy="no-referrer" onClick={()=>onOpenChange(false)} className={row}><Download className="size-4 text-muted-foreground" aria-hidden="true"/>Download</a>
   <Link role="menuitem" href={entryHref(item)} className={row}><ArrowUpRight className="size-4 text-muted-foreground" aria-hidden="true"/>Open {item.access.kind==="memory"?"memory":"moment"}</Link>
   <div className="my-1.5 border-t" role="none"/>
   <button type="button" role="menuitem" onClick={onDelete} className={cn(row,"text-danger hover:bg-danger/10 focus-visible:bg-danger/10")}><Trash2 className="size-4" aria-hidden="true"/>Delete</button>
  </div>:null}
 </div>;
}

/**
 * The sheet that rises from the bottom: the comments, or the caption editor.
 * It is dismissed by pulling its handle down, by tapping the photo above it,
 * or by Escape.
 */
function Sheet({kind,item,onClose,onEditCaption,onSaved}:{kind:"comments"|"caption";item:GalleryItem;onClose:()=>void;onEditCaption:()=>void;onSaved:()=>Promise<void>}){
 const heading=useRef<HTMLHeadingElement>(null),start=useRef<number|null>(null);
 const [pull,setPull]=useState(0);
 useEffect(()=>{heading.current?.focus();},[kind]);
 return <>
  <button type="button" aria-label="Back to the photo" tabIndex={-1} onClick={onClose} className="absolute inset-0 z-30 cursor-default bg-black/35"/>
  <section
   aria-labelledby="viewer-sheet-title"
   className="viewer-sheet absolute inset-x-0 bottom-0 z-40 mx-auto flex max-h-[82dvh] max-w-2xl flex-col rounded-t-surface bg-card text-foreground shadow-paper"
   style={{transform:pull?`translateY(${pull}px)`:undefined}}
  >
   <div
    className="touch-none px-5 pt-2"
    onPointerDown={e=>{if((e.target as HTMLElement).closest("button"))return;e.currentTarget.setPointerCapture(e.pointerId);start.current=e.clientY;}}
    onPointerMove={e=>{if(start.current!==null)setPull(Math.max(0,e.clientY-start.current));}}
    onPointerUp={()=>{const p=pull;start.current=null;setPull(0);if(p>80)onClose();}}
    onPointerCancel={()=>{start.current=null;setPull(0);}}
   >
    <span aria-hidden="true" className="mx-auto block h-1.5 w-10 rounded-full bg-border"/>
    <div className="flex items-center gap-3 pb-3 pt-3">
     <h2 id="viewer-sheet-title" ref={heading} tabIndex={-1} className="min-w-0 flex-1 font-display text-2xl focus:outline-none">{kind==="caption"?(item.caption?"Edit caption":"Add a caption"):"Comments"}</h2>
     <button type="button" onClick={onClose} aria-label="Close" className="grid size-11 shrink-0 place-items-center rounded-control text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X className="size-5" aria-hidden="true"/></button>
    </div>
   </div>
   <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
    {kind==="caption"
     ?<CaptionForm item={item} onCancel={onClose} onSaved={onSaved}/>
     :<>
      {item.caption
       ?<p className="whitespace-pre-wrap break-words leading-7">{item.caption}</p>
       :<button type="button" onClick={onEditCaption} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"><Pencil className="size-4" aria-hidden="true"/>Add a caption</button>}
      <CommentThread key={item.access.kind+item.id} access={item.access} mediaId={item.id} variant="sheet"/>
     </>}
   </div>
  </section>
 </>;
}

function CaptionForm({item,onCancel,onSaved}:{item:GalleryItem;onCancel:()=>void;onSaved:()=>Promise<void>}){
 const [value,setValue]=useState(item.caption),[pending,setPending]=useState(false),[error,setError]=useState(""),field=useId();
 async function save(){
  setPending(true);
  try{
   if(item.access.previewSession)await changePreviewMedia(item.access,item.id,value);
   else{const r=await memoryMediaAction({operation:"caption",kind:item.access.kind,memoryId:item.access.id,id:item.id,caption:value});if(r.error)throw Error(r.error);}
   setError("");await onSaved();
  }catch(e){setError(e instanceof Error?e.message:"We could not save the caption. Try again.");}
  finally{setPending(false);}
 }
 return <form method="post" onSubmit={e=>{e.preventDefault();void save();}} className="space-y-3">
  <Label htmlFor={field} className="sr-only">Caption</Label>
  <textarea id={field} value={value} onChange={e=>setValue(e.target.value)} maxLength={240} rows={3} autoFocus placeholder="What was happening here?" className="block w-full resize-none rounded-control border bg-field px-4 py-3 leading-7 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"/>
  <p className="text-right text-xs text-muted-foreground">{value.length} / 240</p>
  {error?<p role="alert" className="status-message status-error">{error}</p>:null}
  <div className="flex justify-end gap-3"><Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>Cancel</Button><Button type="submit" disabled={pending||value===item.caption}>{pending?"Saving…":"Save caption"}</Button></div>
 </form>;
}
