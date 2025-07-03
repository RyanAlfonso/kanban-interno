"use client";

import useDraggable from "@/hooks/useDraggable";
// import { getLabelColor } from "@/lib/color"; // Removed old import
import { getTagColor, PredefinedTag, TagColor } from "@/lib/tags"; // Added new imports
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
  tags?: string[]; // Added tags to ExtendedTodo
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
      className="border-zinc-100 hover:shadow-md rounded-md mb-2 mx-auto p-3 flex flex-col cursor-pointer bg-white dark:bg-gray-900 relative" // Added relative positioning
      ref={setNodeRef}
      {...attributes}
    >
      <div className="px-2 py-1 flex-grow"> {/* Added flex-grow to allow tags to be at bottom */}
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
        
        {/* Prazo - Moved before tags for better layout with absolute positioned tags */}
        {todo.deadline && (
          <div className="mt-2 mb-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {dayjs(todo.deadline).format("DD/MM/YYYY")}
          </div>
        )}
      </div>

      {/* New Tags Display */}
      {todo.tags && todo.tags.length > 0 && (
        <div className="absolute bottom-2 right-2 flex flex-wrap gap-1 justify-end mt-2">
          {todo.tags.map((tag) => {
            const colors: TagColor = getTagColor(tag as PredefinedTag);
            return (
              <div
                key={tag}
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs leading-tight", // Adjusted padding and leading for smaller look
                  colors.bg,
                  colors.text,
                )}
                title={tag} // Add title for full tag name on hover
              >
                {tag}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TodoCard;

