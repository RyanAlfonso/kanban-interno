import { Todo } from "@prisma/client";
import { FC } from "react";
import { Skeleton } from "../ui/skeleton";
import { Card, CardContent, CardHeader } from "../ui/card";
import { cn } from "@/lib/utils";
import { COLUMN_COLORS } from "@/lib/const";

type SkeletonColumnProps = {
  state: Todo["state"];
};

const SkeletonColumn: FC<SkeletonColumnProps> = ({ state }) => {
  const getColumnColor = (columnId: Todo["state"]) => {
    return COLUMN_COLORS[columnId]?.bg || "bg-gray-50 dark:bg-gray-900";
  };

  const getColumnHeaderColor = (columnId: Todo["state"]) => {
    return (
      COLUMN_COLORS[columnId]?.header || "text-gray-500 dark:text-gray-400"
    );
  };
  return (
    <Card
      className={cn(
        "h-full flex flex-col rounded-lg min-w-[280px] max-w-[280px]",
        getColumnColor(state),
      )}
    >
      <CardHeader
        className={cn("p-3 rounded-t-lg", getColumnHeaderColor(state))}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-2">
        {Array.from({ length: 6 }).map(
          (_, index) => (
            <Card className="mb-3" key={index}>
              <CardContent className="p-3">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <div className="flex items-center">
                  <Skeleton className="h-3 w-3 rounded-full mr-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </CardContent>
            </Card>
          ),
        )}
      </CardContent>
    </Card>
  );
};

export default SkeletonColumn;
