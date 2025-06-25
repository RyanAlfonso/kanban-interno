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
  title: string;
  todos: Todo[];
  state: Todo["state"];
  projectId?: string; // Added projectId as an optional prop
};

const TodoColumn: FC<TodoColumnProp> = ({ title, todos, state, projectId }) => {
  const dispatch = useDispatch();

  // Use composite ID if projectId is provided, otherwise just state
  const droppableId = projectId ? `${projectId}-${state}` : state;
  const { setNodeRef } = useDroppable({ id: droppableId });

  const getColumnColor = (columnId: Todo["state"]) => {
    return COLUMN_COLORS[columnId]?.bg || "bg-gray-50 dark:bg-gray-900";
  };

  const getColumnHeaderColor = (columnId: Todo["state"]) => {
    return (
      COLUMN_COLORS[columnId]?.header || "text-gray-500 dark:text-gray-400"
    );
  };

  const handleOpenDialog = () => {
    dispatch(openTodoEditor({ state }, "/", "create"));
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg shadow-sm min-w-[280px] max-w-[280px] h-fit max-h-[calc(100vh-180px)]",
        getColumnColor(state),
      )}
    >
      <div
        className={cn(
          "p-3 font-medium rounded-t-lg flex items-center justify-between sticky top-0 text-card-foreground",
          getColumnHeaderColor(state),
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
      <HomeTaskCreator state={state} />
    </div>
  );
};

export default TodoColumn;
