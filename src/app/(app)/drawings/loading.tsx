export default function Loading() {
  return (
    <div role="status" aria-label="Opening your drawings" className="reveal-on-load">
      <div className="border-b pb-8">
        <div className="h-4 w-40 rounded media-skeleton" />
        <div className="mt-4 h-12 w-56 rounded media-skeleton" />
      </div>
      <ul className="mt-9 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <li key={index} className="rounded-[1.25rem] bg-secondary/60 p-3">
            <div className="aspect-[4/3] w-full rounded-[0.8rem] media-skeleton" />
            <div className="mt-3 h-4 w-28 rounded media-skeleton" />
          </li>
        ))}
      </ul>
      <p className="sr-only">Opening your drawings…</p>
    </div>
  );
}
