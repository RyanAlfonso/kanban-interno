import { Skeleton } from "@/components/ui/skeleton";

export function VerticalTimelineSkeleton() {
  const timeframes = ["Today", "Yesterday", "This Week"];

  return (
    <div className="space-y-10">
      {timeframes.map((timeframe) => (
        <div key={timeframe} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>

          <div className="space-y-0">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex group">
                <div className="w-28 flex-shrink-0 pr-4 text-right">
                  <Skeleton className="h-5 w-20 ml-auto" />
                </div>

                <div className="relative flex flex-col items-center mr-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  {i !== 1 && (
                    <div className="w-0.5 h-full bg-border absolute top-10 bottom-0 left-1/2 -translate-x-1/2" />
                  )}
                </div>

                <div className="pb-8 w-full">
                  <div className="bg-card border rounded-lg p-4">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>

                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3 mb-3" />

                    <div className="flex flex-wrap gap-2 mb-3">
                      <Skeleton className="h-5 w-20 rounded-md" />
                      <Skeleton className="h-5 w-24 rounded-md" />
                    </div>

                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
