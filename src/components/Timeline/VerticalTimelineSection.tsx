import { TIMEFRAMECOLOR } from "@/lib/const";
import { cn } from "@/lib/utils";
import { TodoWithColumn } from "@/types/todo"; // Import TodoWithColumn
import { FC } from "react";
import TimelineItem from "./TimelineItem";
import dayjs from "dayjs";

type VerticalTimelineSectionProps = {
  title: string;
  todos: TodoWithColumn[]; // Use TodoWithColumn[]
};

const VerticalTimelineSection: FC<VerticalTimelineSectionProps> = ({
  title,
  todos,
}) => {
  if (todos.length === 0) return null;

  // Sorting is already done in TimelineComponent's reduce step,
  // but if it needs to be ensured or done differently here, it can be.
  // For now, assuming todos are correctly sorted as passed.
  // const sortedTodos = todos.toSorted(
  // (a, b) => dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix(),
  // );
  // Using 'todos' directly as they should be pre-sorted.

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div
          className={cn(
            "text-xs px-2 py-1 rounded-full border",
            TIMEFRAMECOLOR[title],
          )}
        >
          {todos.length} task{todos.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="space-y-0">
        {/* Using 'todos' directly as sortedTodos was commented out */}
        {todos.map((todo, index) => (
          <TimelineItem
            key={todo.id}
            todo={todo} // todo is now TodoWithColumn
            isLast={index === todos.length - 1}
          />
        ))}
      </div>
    </div>
  );
};

export default VerticalTimelineSection;
