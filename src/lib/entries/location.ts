import {z} from "zod";
export type PlaceSuggestion={id:string;label:string};
const properties=z.object({osm_id:z.number().optional(),osm_type:z.string().optional(),name:z.string().optional(),housenumber:z.string().optional(),street:z.string().optional(),district:z.string().optional(),city:z.string().optional(),county:z.string().optional(),state:z.string().optional(),country:z.string().optional()});
export function photonPlaces(input:unknown):PlaceSuggestion[]{
 const data=z.object({features:z.array(z.object({properties})).max(20)}).parse(input);
 const seen=new Set<string>();return data.features.flatMap((f,i)=>{const p=f.properties,parts=[p.name,[p.housenumber,p.street].filter(Boolean).join(" "),p.city??p.district??p.county,p.state,p.country].filter((s):s is string=>!!s),label=[...new Set(parts)].join(", ").slice(0,240);if(!label||seen.has(label))return [];seen.add(label);return [{id:(p.osm_type??"place")+String(p.osm_id??i),label}];}).slice(0,5);
}
