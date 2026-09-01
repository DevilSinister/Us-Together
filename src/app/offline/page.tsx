import Link from "next/link";
import { WifiOff } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="max-w-md text-center">
        <BrandMark className="justify-center" />
        <WifiOff className="mx-auto mt-12 size-10 text-primary" aria-hidden="true" />
        <h1 className="mt-6 font-display text-4xl tracking-[-0.025em]">You’re offline for a moment.</h1>
        <p className="mt-4 leading-7 text-muted-foreground">Reconnect before viewing or changing your private space. We don’t queue relationship data without clear conflict handling.</p>
        <Button asChild className="mt-8"><Link href="/">Try again</Link></Button>
      </div>
    </main>
  );
}
