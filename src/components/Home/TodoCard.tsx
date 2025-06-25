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

// Define Label type to match assumed structure from backend
interface Label {
  id: string;
  name: string;
  color: string; // Assuming backend provides a color string (e.g., Tailwind class or hex)
                 // For now, getLabelColor(name) will be used, but this field is available.
}

// Estendendo o tipo Todo para incluir a relação com o projeto e as novas etiquetas
interface ExtendedTodo extends Todo {
  project?: {
    id: string;
    name: string;
  } | null;
  labels?: Label[]; // Expecting an array of Label objects
                   // This replaces or supersedes the old `label: string[]` from Prisma Todo
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
      className="border-zinc-100 hover:shadow-md rounded-md mb-2 mx-auto p-3 flex flex-col cursor-pointer bg-white dark:bg-gray-800 relative" // Added relative for label positioning
      ref={setNodeRef}
      {...attributes}
    >
      <div className="px-2 py-1 flex-grow"> {/* Added flex-grow */}
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
        
        {/* Prazo - Moved before labels for better layout with absolute positioned labels */}
        {todo.deadline && (
          <div className="mt-1 mb-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {dayjs(todo.deadline).format("DD/MM/YYYY")}
          </div>
        )}
      </div>

      {/* Etiquetas - Positioned at bottom right */}
      {todo.labels && todo.labels.length > 0 && (
        <div className="px-2 pt-1 pb-0 mt-auto"> {/* Ensures it's at the bottom of the flex column */}
          <div className="flex gap-1 flex-wrap justify-end"> {/* justify-end for bottom-right feel */}
            {todo.labels.map((labelObj) => (
              <div
                key={labelObj.id}
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs leading-4", // Smaller padding and text
                  getLabelColor(labelObj.name).badge // Use only the .badge style for a complete badge appearance
                )}
                title={labelObj.name} // Show full name on hover
              >
                {labelObj.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
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

