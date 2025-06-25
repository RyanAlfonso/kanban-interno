import { Badge } from "@/components/ui/badge";
import { getLabelColor } from "@/lib/color";
import { getRelativeTimeString } from "@/lib/date-util";
import { cn } from "@/lib/utils";
import { openTodoEditor } from "@/redux/actions/todoEditorAction";
import { Todo } from "@prisma/client";
import dayjs from "dayjs";
import {
  BarChart2,
  Calendar,
  CheckCircle,
  Clock,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { FC } from "react";
import { useDispatch } from "react-redux";

type TimelineItemProps = {
  todo: Todo;
  isLast?: boolean;
};

const TimelineItem: FC<TimelineItemProps> = ({ todo, isLast = false }) => {
  const dispatch = useDispatch();

  const dueDate = todo.deadline ? dayjs(todo.deadline) : null;
  const createdDate = dayjs(todo.createdAt);

  // Determine if task is overdue
  const isOverdue = !!dueDate && createdDate.isAfter(dueDate);
  const isFinished = todo.state === "DONE" || todo.state === "REVIEW";

  // Get the appropriate icon based on task status
  const getStatusIcon = (state: Todo["state"]) => {
    switch (state) {
      case "TODO":
        return <Settings className="h-5 w-5" />;
      case "IN_PROGRESS":
        return <BarChart2 className="h-5 w-5" />;
      case "REVIEW":
        return <Clock className="h-5 w-5" />;
      case "DONE":
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Settings className="h-5 w-5" />;
    }
  };

  // Get the appropriate color based on task status
  const getStatusColor = (state: Todo["state"]) => {
    switch (state) {
      case "TODO":
        return "bg-blue-500 text-white";
      case "IN_PROGRESS":
        return "bg-amber-500 text-white";
      case "REVIEW":
        return "bg-purple-500 text-white";
      case "DONE":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const handleClick = () => {
    dispatch(openTodoEditor(todo, "/timeline", "edit"));
  };

  return (
    <>
      <div className="flex-shrink-0 text-sm text-muted-foreground pt-0.5 pr-4 md:hidden pl-14">
        {createdDate.format("YYYY-MM-DD")}
      </div>
      <div className="flex group">
        {/* Date column */}
        <div className="w-28 flex-shrink-0 text-sm text-muted-foreground pt-0.5 pr-4 text-right hidden md:relative">
          {createdDate.format("YYYY-MM-DD")}
        </div>

        {/* Timeline connector */}
        <div className="relative flex flex-col items-center mr-4">
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full z-0",
              getStatusColor(todo.state),
            )}
          >
            {getStatusIcon(todo.state)}
          </div>
          {!isLast && (
            <div className="w-0.5 h-full bg-border absolute top-10 bottom-0 left-1/2 -translate-x-1/2" />
          )}
        </div>

        {/* Content */}
        <div className="pb-8 w-full">
          <div
            className="block group-hover:opacity-90 transition-opacity cursor-pointer"
            onClick={handleClick}
          >
            <div className="bg-card border rounded-lg p-4 shadow-sm hover:shadow transition-shadow">
              <div className="flex justify-between items-start gap-4 mb-2">
                <h3 className="font-medium text-lg">{todo.title}</h3>
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize",
                    todo.state === "TODO" &&
                      "bg-blue-500/10 text-blue-500 border-blue-500/20",
                    todo.state === "IN_PROGRESS" &&
                      "bg-amber-500/10 text-amber-500 border-amber-500/20",
                    todo.state === "REVIEW" &&
                      "bg-purple-500/10 text-purple-500 border-purple-500/20",
                    todo.state === "DONE" &&
                      "bg-green-500/10 text-green-500 border-green-500/20",
                  )}
                >
                  {todo.state.replace("_", " ")}
                </Badge>
              </div>

              {todo.label.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {todo.label.map((label) => (
                    <div
                      key={label}
                      className={cn(
                        "px-2 py-0.5 rounded-full leading-5 text-sm",
                        getLabelColor(label).bg,
                        getLabelColor(label).badge,
                      )}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  <span>{getRelativeTimeString(createdDate)}</span>
                </div>

                {dueDate && (
                  <div className="flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    <span
                      className={cn(
                        isOverdue && !isFinished
                          ? "text-red-500 font-medium"
                          : "",
                        isFinished && "text-green-500 font-medium",
                      )}
                    >
                      Due {dayjs(dueDate).format("MMM D")}
                    </span>
                  </div>
                )}

                {/* {isOverdue && !isFinished && ( */}
                {/*   <Badge */}
                {/*     variant="outline" */}
                {/*     className="bg-red-500/10 text-red-500 border-red-500/20" */}
                {/*   > */}
                {/*     Overdue */}
                {/*   </Badge> */}
                {/* )} */}
                {/* {!!dueDate && isFinished && ( */}
                {/*   <Badge */}
                {/*     variant="outline" */}
                {/*     className="bg-green-500/10 text-green-500 border-green-500/20" */}
                {/*   > */}
                {/*     Finished */}
                {/*   </Badge> */}
                {/* )} */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TimelineItem;
