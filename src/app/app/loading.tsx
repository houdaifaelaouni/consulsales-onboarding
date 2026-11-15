import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-8 px-4 py-8 sm:py-12" aria-busy="true">
      <div className="space-y-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-24" /></div>
      <Skeleton className="h-36 w-full" />
      <div className="space-y-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
    </main>
  );
}
