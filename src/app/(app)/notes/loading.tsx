export default function Loading() {
  return (
    <div role="status" aria-label="Opening your notes" className="reveal-on-load">
      <div className="border-b pb-8">
        <div className="h-4 w-36 rounded media-skeleton" />
        <div className="mt-4 h-12 w-72 rounded media-skeleton" />
      </div>
      <ul className="mt-10 divide-y border-y" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <li key={index} className="flex gap-4 py-6">
            <div className="mt-1 size-5 rounded-full media-skeleton" />
            <div className="flex-1 space-y-3">
              <div className="h-6 w-2/3 rounded media-skeleton" />
              <div className="h-4 w-32 rounded media-skeleton" />
              <div className="h-4 w-full rounded media-skeleton" />
            </div>
          </li>
        ))}
      </ul>
      <p className="sr-only">Opening your notes…</p>
    </div>
  );
}
