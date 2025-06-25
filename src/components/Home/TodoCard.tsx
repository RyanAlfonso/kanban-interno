"use client";

import useDraggable from "@/hooks/useDraggable";
import { getLabelColor } from "@/lib/color";
import { cn } from "@/lib/utils";
import { openTodoEditor } from "@/redux/actions/todoEditorAction";
import { Todo } from "@prisma/client";
import dayjs from "dayjs";
import { Clock, Folder } from "lucide-react";
import { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useSearchParams } from "next/navigation";

// Estendendo o tipo Todo para incluir a relação com o projeto
interface ExtendedTodo extends Todo {
  project?: {
    id: string;
    name: string;
  } | null;
}

type TodoProps = {
  todo: ExtendedTodo;
};

const TodoCard: FC<TodoProps> = ({ todo }) => {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const currentProjectId = searchParams.get("projectId") || "all";

  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      dispatch(openTodoEditor(todo, "/", "edit"));
    },
    [dispatch, todo],
  );

  const { setNodeRef, attributes } = useDraggable({
    id: todo.id,
    handleClick,
  });

  // Verificar se deve mostrar o Nome da área (apenas quando visualizando Todas as áreas)
  const showProjectName = currentProjectId === "all" || !currentProjectId;

  return (
    <div
      className="border-zinc-100 hover:shadow-md rounded-md mb-2 mx-auto p-3 flex flex-col cursor-pointer bg-white dark:bg-gray-800"
      ref={setNodeRef}
      {...attributes}
    >
      <div className="px-2 py-1 ">
        <div className="pb-2 font-bold overflow-hidden whitespace-nowrap text-ellipsis text-card-foreground">
          {todo.title}
        </div>
        
        {/* Exibir Nome da área quando visualizando Todas as áreas */}
        {showProjectName && todo.project && (
          <div className="mb-2 text-xs text-gray-600 dark:text-gray-300 flex items-center">
            <Folder className="h-3 w-3 mr-1" />
            <span className="truncate" title={todo.project.name}>
              {todo.project.name}
            </span>
          </div>
        )}
        
        {/* tags */}
        {todo.label && todo.label.length > 0 && (
          <div className="flex gap-2 flex-wrap">
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
        
        {/* Prazo */}
        {todo.deadline && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {dayjs(todo.deadline).format("DD/MM/YYYY")}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoCard;

