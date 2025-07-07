"use client";

import useDroppable from "@/hooks/useDroppable";
import { cn } from "@/lib/utils";
import { openTodoEditor } from "@/redux/actions/todoEditorAction";
import { Todo } from "@prisma/client";
import { PlusCircle, Trash2 } from "lucide-react";
import { FC } from "react";
import { useDispatch } from "react-redux";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import HomeTaskCreator from "./HomeTaskCreator";
import TodoCard from "./TodoCard";

type TodoColumnProp = {
  title: string;
  todos: Todo[];
  columnId: string;
  projectId?: string;
  onDeleteColumn?: (columnId: string) => void;
};

const TodoColumn: FC<TodoColumnProp> = ({ title, todos, columnId, projectId, onDeleteColumn }) => {
  const dispatch = useDispatch();

  const { setNodeRef } = useDroppable({ id: columnId });

  const genericColumnColor = "bg-slate-100 dark:bg-slate-800";
  const genericColumnHeaderColor = "text-slate-600 dark:text-slate-300";

  const handleOpenDialog = () => {
    dispatch(openTodoEditor({ columnId: columnId, projectId: projectId }, "/", "create"));
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg shadow-sm min-w-[280px] max-w-[280px] h-fit max-h-[calc(100vh-180px)]",
        genericColumnColor,
      )}
    >
      <div
        className={cn(
          "p-3 font-medium rounded-t-lg flex items-center justify-between sticky top-0 text-card-foreground",
          genericColumnHeaderColor,
        )}
      >
        <div className="flex items-center">
          <span>{title}</span>
          <Badge className="ml-2 bg-white text-foreground dark:bg-gray-800">
            {todos.length}
          </Badge>
        </div>
        <div className="flex items-center space-x-1">
          {onDeleteColumn && (
             <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDeleteColumn(columnId)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleOpenDialog()}
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative p-2 overflow-auto min-h-[50px]" ref={setNodeRef}>
        {todos
          ?.sort((a, b) => a.order - b.order)
          .map((todo) => {
            return <TodoCard todo={todo} key={todo.id.toString()} />;
          })}
      </div>
      <HomeTaskCreator columnId={columnId} projectId={projectId} />
    </div>
  );
};

export default TodoColumn;
