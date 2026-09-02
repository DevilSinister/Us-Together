import { notFound } from "next/navigation";
import { loadMemory } from "@/lib/memories/data";
import { MemoryDetailView } from "@/components/memories/detail";
export const metadata={title:"Memory"};
export default async function MemoryPage({params}:{params:Promise<{id:string}>}) {
 const {id}=await params,data=await loadMemory(id);if(!data)notFound();
 return <MemoryDetailView data={data}/>;
}
