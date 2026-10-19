export type EntryKind="memory"|"moment";
export type EntryMedia={id:string;caption:string;media_type:string;mime_type:string;state:string;size_bytes:number;duration_seconds:number|null;url?:string;previewUrl?:string;
 /** Whether the signed-in person added it. Only they can finish or discard it while it is unfinished. */
 mine?:boolean};
export type EntryComment={id:string;body:string;created_at:string;mine:boolean};
export type EntryAccess={kind:EntryKind;id:string;previewSession?:string};
