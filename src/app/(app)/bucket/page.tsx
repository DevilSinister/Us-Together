import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Cover, CoverSheet } from "@/components/app/cover";
import { EmptyState } from "@/components/app/states";
import { NewList } from "@/components/bucket/new-list";
import { loadBucketOverview, type BucketOverview } from "@/lib/bucket/data";

export const metadata = { title: "Bucket lists" };

const count = (n: number, one: string, many: string) => `${n.toLocaleString("en")} ${n === 1 ? one : many}`;
const livedDay = (day: string, thisYear: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: day.startsWith(thisYear) ? undefined : "numeric", timeZone: "UTC" }).format(new Date(day + "T12:00:00Z"));

/**
 * Bucket lists as a Cover screen (ADR-053). The band counts every dream and
 * how many are lived. Each list is a ruled row led by a ring that fills as its
 * dreams are lived; "Lately lived" closes the page with the few most recent.
 * A new list opens from the floating button, or the band button from tablet
 * width, and the list itself opens once made.
 */
export default async function BucketPage() {
  let overview: BucketOverview | null = null;
  let failure = "";
  try {
    overview = await loadBucketOverview();
  } catch (error) {
    failure = error instanceof Error ? error.message : "We couldn't load your lists.";
  }
  const thisYear = String(new Date().getUTCFullYear());

  return (
    <>
      <Cover labelledBy="bucket-title" height="band" action={overview ? <NewList placement="band" /> : null}>
        <h1 id="bucket-title" className="font-display text-[2.5rem] leading-[1.05] tracking-[-0.02em]">Bucket lists</h1>
        <p className="mt-1.5 text-[0.9375rem] leading-6 text-muted-foreground">
          {overview?.dreams ? `${count(overview.dreams, "dream", "dreams")} · ${overview.lived.toLocaleString("en")} lived` : "Every kind of someday, kept together"}
        </p>
      </Cover>

      <CoverSheet>
        {failure ? (
          <EmptyState
            className="mt-0"
            title="We couldn’t open your lists."
            body={failure}
            action={<>
              <Button asChild><Link href="/bucket">Try again</Link></Button>
              <Button asChild variant="outline"><Link href="/pairing">Your shared space</Link></Button>
            </>}
          />
        ) : overview && !overview.lists.length ? (
          <EmptyState
            className="mt-0"
            title="What would you love to do together?"
            body="Start a list for a weekend ritual, a faraway place, or a small adventure close to home."
            action={<NewList placement="empty" />}
          />
        ) : overview ? (
          <div className="flex max-w-2xl flex-col gap-7">
            <ul aria-label="Your lists" className="flex flex-col">
              {overview.lists.map((list) => (
                <li key={list.id} className="border-b border-border last:border-0">
                  <Link href={`/bucket/lists/${list.id}`} className="group flex min-h-[4.25rem] items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    <Ring lived={list.lived} dreams={list.dreams} />
                    <span className="flex min-w-0 flex-1 flex-col-reverse gap-px">
                      <span className="break-words text-[1.0625rem] font-semibold leading-[1.35] transition-colors duration-150 group-hover:text-primary motion-reduce:transition-none">{list.title}</span>
                      <span className="text-[0.8125rem] leading-5 text-muted-foreground">{list.dreams ? `${count(list.dreams, "dream", "dreams")} · ${list.lived.toLocaleString("en")} lived` : "No dreams yet"}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>

            {overview.recent.length ? (
              <section aria-labelledby="lived-title" className="flex flex-col">
                <h2 id="lived-title" className="font-display text-[1.375rem] leading-[1.3]">Lately lived</h2>
                <ul className="mt-1 flex flex-col">
                  {overview.recent.map((dream) => (
                    <li key={dream.id} className="border-b border-border last:border-0">
                      <Link href={`/bucket/${dream.id}`} className="group flex min-h-[4.25rem] items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-success"><Check className="size-5" aria-hidden="true" /></span>
                        <span className="flex min-w-0 flex-1 flex-col-reverse gap-px">
                          <span className="break-words text-[1.0625rem] font-semibold leading-[1.35] transition-colors duration-150 group-hover:text-primary motion-reduce:transition-none">{dream.title}</span>
                          <span className="text-[0.8125rem] leading-5 text-muted-foreground">{[dream.listTitle, dream.livedOn ? "lived " + livedDay(dream.livedOn, thisYear) : "lived"].filter(Boolean).join(" · ")}</span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </CoverSheet>

      {overview ? <NewList placement="floating" /> : null}
    </>
  );
}

/** How much of a list is lived, as a ring that fills clockwise from the top. Its words are in the row. */
function Ring({ lived, dreams }: { lived: number; dreams: number }) {
  const circumference = 2 * Math.PI * 18;
  const share = dreams ? lived / dreams : 0;
  return (
    <svg aria-hidden="true" width="44" height="44" viewBox="0 0 44 44" fill="none" className="shrink-0">
      <circle cx="22" cy="22" r="18" strokeWidth="4" className="stroke-border" />
      {share > 0 ? (
        <circle cx="22" cy="22" r="18" strokeWidth="4" strokeLinecap="round" className="stroke-primary"
          strokeDasharray={`${(share * circumference).toFixed(1)} ${circumference.toFixed(1)}`} transform="rotate(-90 22 22)" />
      ) : null}
    </svg>
  );
}
