"use client";

import useDraggable from "@/hooks/useDraggable";
import { getTagColor, PredefinedTag, TagColor } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { openTodoEditor } from "@/redux/actions/todoEditorAction";
import { Todo, User } from "@prisma/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import dayjs from "dayjs";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Folder,
  History,
  Link,
  Share2,
  Users,
} from "lucide-react";
// --- IMPORTAÇÕES ADICIONADAS ---
import { usePathname, useSearchParams } from "next/navigation";
import { FC, useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { Button } from "../ui/button";
import { useToast } from "../ui/use-toast";

interface ExtendedTodo extends Todo {
  project?: {
    id: string;
    name: string;
  } | null;
  tags: string[];
  assignedTo?: User[];
  movementHistory?: {
    id: string;
    movedAt: Date;
    movedBy: {
      id: string;
      name: string;
    };
    fromColumn: {
      id: string;
      name: string;
    };
    toColumn: {
      id: string;
      name: string;
    };
  }[];
  parent?: {
    id: string;
    title: string;
  } | null;
  childTodos?: {
    id: string;
    title: string;
  }[];
  linkedCards?: {
    id: string;
    title: string;
  }[];
}

type TodoProps = {
  todo: ExtendedTodo;
};
const TodoCard: FC<TodoProps> = ({ todo }) => {
  const dispatch = useDispatch();
  const { toast } = useToast();

  // --- HOOKS DE NAVEGAÇÃO INICIALIZADOS ---
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentProjectId = searchParams.get("projectId") || "all";
  const [showHistory, setShowHistory] = useState(false);

  // --- FUNÇÃO 'handleClick' CORRIGIDA ---
  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();

      // Constrói a URL de retorno completa e dinâmica
      const returnUrl = `${pathname}?${searchParams.toString()}`;

      // Passa a URL correta para a action do Redux
      dispatch(openTodoEditor(todo, returnUrl, "edit"));
    },
    [dispatch, todo, pathname, searchParams] // Adiciona dependências
  );

  const handleShare = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_PATH}/api/share/${todo.id}`
        );
        if (!response.ok) {
          throw new Error("Failed to generate share link");
        }
        const data = await response.json();

        await navigator.clipboard.writeText(data.shareableLink);
        toast({
          title: "Link copiado!",
          description:
            "O link da tarefa foi copiado para a área de transferência.",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível gerar o link de compartilhamento.",
          variant: "destructive",
        });
      }
    },
    [todo.id, toast]
  );

  const { setNodeRef, attributes } = useDraggable({
    id: todo.id,
    handleClick,
  });

  const showProjectName = currentProjectId === "all" || !currentProjectId;
  return (
    <div
      className="border-zinc-100 hover:shadow-md rounded-md mb-2 mx-auto p-3 flex flex-col cursor-pointer bg-white dark:bg-gray-900 relative group"
      ref={setNodeRef}
      {...attributes}
    >
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={handleShare}
        title="Compartilhar tarefa"
      >
        <Share2 className="h-3 w-3" />
      </Button>
      <div className="px-2 py-1 flex-grow">
        <div className="pb-2 font-bold overflow-hidden whitespace-nowrap text-ellipsis text-card-foreground">
          {todo.title}
        </div>

        {showProjectName && todo.project && (
          <div className="mb-2 text-xs text-gray-600 dark:text-gray-300 flex items-center">
            <Folder className="h-3 w-3 mr-1" />
            <span className="truncate" title={todo.project.name}>
              {todo.project.name}
            </span>
          </div>
        )}

        {todo.assignedTo && todo.assignedTo.length > 0 && (
          <div className="mb-2 text-xs text-gray-600 dark:text-gray-300 flex items-center">
            <Users className="h-3 w-3 mr-1" />
            <span className="truncate">
              {todo.assignedTo
                .map((user) => user.name || user.email)
                .join(", ")}
            </span>
          </div>
        )}

        {todo.referenceDocument && (
          <div className="mb-2 text-xs text-gray-600 dark:text-gray-300 flex items-center">
            <Folder className="h-3 w-3 mr-1" />
            <span
              className="truncate"
              title={`Documento: ${todo.referenceDocument}`}
            >
              Doc: {todo.referenceDocument}
            </span>
          </div>
        )}

        {todo.parent && (
          <div className="mb-2 text-xs text-blue-600 dark:text-blue-400 flex items-center">
            <ArrowUp className="h-3 w-3 mr-1" />
            <span className="truncate" title={`Card pai: ${todo.parent.title}`}>
              Pai: {todo.parent.title}
            </span>
          </div>
        )}

        {todo.childTodos && todo.childTodos.length > 0 && (
          <div className="mb-2 text-xs text-green-600 dark:text-green-400 flex items-center">
            <ArrowDown className="h-3 w-3 mr-1" />
            <span className="truncate">
              Filhos: {todo.childTodos.length} card(s)
            </span>
          </div>
        )}

        {todo.linkedCards && todo.linkedCards.length > 0 && (
          <div className="mb-2 text-xs text-purple-600 dark:text-purple-400 flex items-center">
            <Link className="h-3 w-3 mr-1" />
            <span className="truncate">
              Relacionados: {todo.linkedCards.length} card(s)
            </span>
          </div>
        )}

        {todo.deadline && (
          <div className="mt-2 mb-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {dayjs(todo.deadline).format("DD/MM/YYYY")}
          </div>
        )}
        {todo.movementHistory && todo.movementHistory.length > 0 && (
          <div className="mt-2 mb-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 p-1 text-xs">
                  <History className="h-3 w-3 mr-1" />
                  Histórico ({todo.movementHistory.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3 bg-white dark:bg-gray-900 border rounded-md shadow-md z-50">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    Histórico de Movimentação
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {todo.movementHistory.map((movement) => (
                      <div
                        key={movement.id}
                        className="text-xs border-l-2 border-gray-200 pl-2"
                      >
                        <div className="font-medium">
                          {movement.movedBy.name} moveu de{" "}
                          {movement.fromColumn.name} para{" "}
                          {movement.toColumn.name}
                        </div>
                        <div className="text-gray-500">
                          {dayjs(movement.movedAt).format("DD/MM/YYYY HH:mm")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {(todo.parent ||
          (todo.childTodos && todo.childTodos.length > 0) ||
          (todo.linkedCards && todo.linkedCards.length > 0)) && (
          <div className="mt-2 mb-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 p-1 text-xs">
                  <Link className="h-3 w-3 mr-1" />
                  Vinculações
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3 bg-white dark:bg-gray-900 border rounded-md shadow-md z-50">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Vinculações do Card</h4>

                  {/* --- CÓDIGO JSX COMPLETO AQUI --- */}
                  {todo.parent && (
                    <div>
                      <h5 className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                        Card Pai:
                      </h5>
                      <div className="text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                        {todo.parent.title}
                      </div>
                    </div>
                  )}

                  {todo.childTodos && todo.childTodos.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                        Cards Filhos:
                      </h5>
                      <div className="space-y-1">
                        {todo.childTodos.map((child) => (
                          <div
                            key={child.id}
                            className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded"
                          >
                            {child.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {todo.linkedCards && todo.linkedCards.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                        Cards Relacionados:
                      </h5>
                      <div className="space-y-1">
                        {todo.linkedCards.map((linked) => (
                          <div
                            key={linked.id}
                            className="text-xs bg-purple-50 dark:bg-purple-900/20 p-2 rounded"
                          >
                            {linked.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {todo.tags && todo.tags.length > 0 && (
        <div className="absolute bottom-2 right-2 flex flex-wrap gap-1 justify-end mt-2">
          {todo.tags.map((tag) => {
            const colors: TagColor = getTagColor(tag as PredefinedTag);
            return (
              <div
                key={tag}
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs leading-tight",
                  colors.bg,
                  colors.text
                )}
                title={tag}
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
