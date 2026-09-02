import Link from "next/link";
import { notFound } from "next/navigation";
import { loadMemory } from "@/lib/memories/data";
import { MemoryForm } from "@/components/dream/memory-form";
export const metadata={title:"Edit memory"};
export default async function EditMemoryPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params,data=await loadMemory(id);if(!data)notFound();
 return <div className="mx-auto max-w-3xl"><Link className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline" href={"/memories/"+id}>Back to memory</Link><h1 className="my-6 font-display text-5xl">Keep the story true.</h1><MemoryForm memory={data.memory}/></div>;
}
