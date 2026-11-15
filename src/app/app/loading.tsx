import { cx } from "@/utils/cx";

export default function Loading() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 lg:px-8" aria-busy="true" role="status" aria-label="Loading">
      <div className="flex flex-col gap-3">
        {["h-4 w-40", "h-8 w-64", "h-4 w-72"].map((c) => <div key={c} className={cx("animate-pulse rounded-md bg-quaternary", c)} />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-secondary ring-1 ring-secondary" />)}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-secondary ring-1 ring-secondary" />
    </main>
  );
}
