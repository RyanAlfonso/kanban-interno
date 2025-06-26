"use client";

import useDroppable from "@/hooks/useDroppable";
import { COLUMN_COLORS } from "@/lib/const";
import { cn } from "@/lib/utils";
import { openTodoEditor } from "@/redux/actions/todoEditorAction";
import { Todo } from "@prisma/client";
import { PlusCircle } from "lucide-react";
import { FC } from "react";
import { useDispatch } from "react-redux";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import HomeTaskCreator from "./HomeTaskCreator";
import TodoCard from "./TodoCard";

type TodoColumnProp = {
  title: string; // Will be column.name
  todos: Todo[];
  // state: Todo["state"]; // Removed state
  columnId: string; // Added columnId
  projectId?: string;
};

const TodoColumn: FC<TodoColumnProp> = ({ title, todos, columnId, projectId }) => {
  const dispatch = useDispatch();

  // Use columnId as the droppableId, it's globally unique
  const { setNodeRef } = useDroppable({ id: columnId });

  // Using generic colors for now, as dynamic columns might not map to COLUMN_COLORS by state
  const genericColumnColor = "bg-slate-100 dark:bg-slate-800";
  const genericColumnHeaderColor = "text-slate-600 dark:text-slate-300";

  const handleOpenDialog = () => {
    // Pass columnId when opening editor for a new task in this column
    dispatch(openTodoEditor({ columnId: columnId, projectId: projectId }, "/", "create"));
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg shadow-sm min-w-[280px] max-w-[280px] h-fit max-h-[calc(100vh-180px)]",
        genericColumnColor, // Use generic color
      )}
    >
      <div
        className={cn(
          "p-3 font-medium rounded-t-lg flex items-center justify-between sticky top-0 text-card-foreground",
          genericColumnHeaderColor, // Use generic header color
        )}
      >
        <div className="flex items-center">
          <span>{title}</span>
          <Badge className="ml-2 bg-white text-foreground dark:bg-gray-800">
            {todos.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleOpenDialog()}
        >
          <PlusCircle className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative p-2 overflow-auto min-h-[50px]" ref={setNodeRef}>
        {todos
          ?.sort((a, b) => a.order - b.order)
          .map((todo) => {
            return <TodoCard todo={todo} key={todo.id.toString()} />;
          })}
      </div>
      {/* Pass columnId and projectId to HomeTaskCreator instead of state */}
      <HomeTaskCreator columnId={columnId} projectId={projectId} />
    </div>
  );
};

export default TodoColumn;
