export default function Loading() {
  return (
    <div role="status" aria-label="Opening this note" className="mx-auto max-w-2xl reveal-on-load">
      <div className="h-4 w-28 rounded media-skeleton" />
      <div className="mt-6 h-12 w-3/4 rounded media-skeleton" />
      <div className="mt-6 h-4 w-40 rounded media-skeleton" />
      <div className="mt-8 space-y-3" aria-hidden="true">
        <div className="h-5 w-full rounded media-skeleton" />
        <div className="h-5 w-11/12 rounded media-skeleton" />
        <div className="h-5 w-4/5 rounded media-skeleton" />
      </div>
      <p className="sr-only">Opening this note…</p>
    </div>
  );
}
