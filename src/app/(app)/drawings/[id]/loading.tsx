export default function Loading() {
  return (
    <div role="status" aria-label="Opening this drawing" className="mx-auto max-w-[46rem] pb-8 reveal-on-load">
      <div className="h-4 w-24 rounded media-skeleton" />
      <div className="mt-5 h-12 w-64 rounded media-skeleton" />
      <div className="mt-7 rounded-[1.5rem] bg-secondary/60 p-3 sm:p-5" aria-hidden="true">
        <div className="aspect-[4/3] w-full rounded-[1rem] media-skeleton" />
      </div>
      <p className="sr-only">Opening this drawing…</p>
    </div>
  );
}
