"use client";
import { Button } from "@/components/ui/button";
export default function BucketError({ reset }: { reset: () => void }) { return <section><h1 className="font-display text-4xl">Your ideas have not gone anywhere.</h1><p className="my-5 text-muted-foreground">We could not open this page. Check your connection, then try again.</p><Button onClick={reset}>Try again</Button></section>; }
