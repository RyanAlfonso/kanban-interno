"use client";

// Importações de hooks e utilitários do projeto
import useDraggable from "@/hooks/useDraggable";
import { getTagColor, PredefinedTag, TagColor } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { openTodoEditor } from "@/redux/actions/todoEditorAction";

// Importações de tipos do Prisma
import { Todo, User } from "@prisma/client";

// Importações de componentes de UI
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "../ui/button";
import { useToast } from "../ui/use-toast";

// Importações de bibliotecas e ícones
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
import {
  FC,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  useCallback,
} from "react";
import { useDispatch } from "react-redux";
import { usePathname, useSearchParams } from "next/navigation";

// A interface que estende o tipo Todo para incluir relações populadas
interface ExtendedTodo extends Todo {
  project?: { id: string; name: string } | null;
  tags: string[];
  assignedTo?: User[];
  movementHistory?: {
    id: string;
    movedAt: Date;
    movedBy: { id: string; name: string };
    fromColumn: { id: string; name: string };
    toColumn: { id: string; name: string };
  }[];
  parent?: { id: string; title: string } | null;
  childTodos?: { id: string; title: string }[];
  linkedCards?: { id: string; title: string }[];
}

type TodoProps = {
  todo: ExtendedTodo;
};

// --- Componente reutilizável para o Tooltip com Hover ---
type RelationshipTooltipProps = {
  triggerIcon: ReactNode;
  title: string;
  items: { id: string; title: string }[] | undefined | null;
  colorClass: string;
  onItemClick: (cardId: string) => void;
};

const RelationshipTooltip: FC<RelationshipTooltipProps> = ({
  triggerIcon,
  title,
  items,
  colorClass,
  onItemClick,
}) => {
  // Não renderiza o ícone se não houver nenhuma relação correspondente
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="p-1">{triggerIcon}</div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start" // Alinha o início do tooltip com o início do ícone
        className="w-72 z-30 bg-background p-3"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="space-y-2">
          <h4 className={cn("font-bold text-sm", colorClass)}>{title}</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto p-1">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation(); // Impede que o clique se propague para o card principal
                  onItemClick(item.id);
                }}
                className="w-full text-left text-xs p-2 rounded bg-accent text-accent-foreground hover:ring-2 hover:ring-ring transition-all"
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

const TodoCard: FC<TodoProps> = ({ todo }) => {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentProjectId = searchParams.get("projectId") || "all";

  // Função para abrir o editor do card principal
  const handleCardClick = useCallback(() => {
    const returnUrl = `${pathname}?${searchParams.toString()}`;
    dispatch(openTodoEditor(todo, returnUrl, "edit"));
  }, [dispatch, todo, pathname, searchParams]);

  // Função para buscar e abrir um card vinculado
  const handleOpenLinkedCard = useCallback(
    async (cardId: string) => {
      try {
        const response = await fetch(`/api/todo/${cardId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Card não encontrado.");
        }
        const cardToOpen: ExtendedTodo = await response.json();
        const returnUrl = `${pathname}?${searchParams.toString()}`;
        dispatch(openTodoEditor(cardToOpen, returnUrl, "edit"));
      } catch (error: any) {
        console.error("Erro ao abrir card vinculado:", error);
        toast({
          title: "Erro",
          description:
            error.message || "Não foi possível carregar o card selecionado.",
          variant: "destructive",
        });
      }
    },
    [dispatch, pathname, searchParams, toast]
  );

  const handleShare = useCallback(
    async (e: ReactMouseEvent) => {
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

  // O hook de arrastar não lida mais com o clique
  const { setNodeRef, attributes } = useDraggable({
    id: todo.id,
  });

  const showProjectName = currentProjectId === "all" || !currentProjectId;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        onClick={handleCardClick} // O clique principal é definido aqui
        className="border-zinc-100 hover:shadow-xl rounded-lg mb-2 mx-auto p-3 flex flex-col cursor-pointer bg-white dark:bg-gray-900 relative group transition-shadow duration-200"
        ref={setNodeRef}
        {...attributes}
      >
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-20"
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
        </div>

        <div className="flex items-center justify-between mt-2 px-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 text-gray-500">
            <RelationshipTooltip
              triggerIcon={<ArrowUp className="h-4 w-4 text-blue-500" />}
              title="Card Pai"
              items={todo.parent ? [todo.parent] : []}
              colorClass="text-blue-500"
              onItemClick={handleOpenLinkedCard}
            />
            <RelationshipTooltip
              triggerIcon={<ArrowDown className="h-4 w-4 text-green-500" />}
              title={`Cards Filhos (${todo.childTodos?.length || 0})`}
              items={todo.childTodos}
              colorClass="text-green-500"
              onItemClick={handleOpenLinkedCard}
            />
            <RelationshipTooltip
              triggerIcon={<Link className="h-4 w-4 text-purple-500" />}
              title={`Cards Relacionados (${todo.linkedCards?.length || 0})`}
              items={todo.linkedCards}
              colorClass="text-purple-500"
              onItemClick={handleOpenLinkedCard}
            />

            {todo.deadline && (
              <div
                className="flex items-center text-xs"
                title={dayjs(todo.deadline).format("DD/MM/YYYY")}
              >
                <Clock className="h-3 w-3 mr-1" />
                <span>{dayjs(todo.deadline).format("DD/MM/YYYY")}</span>
              </div>
            )}

            {todo.movementHistory && todo.movementHistory.length > 0 && (
              <Popover>
                <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <div
                    className="flex items-center cursor-pointer p-1"
                    title="Ver histórico"
                  >
                    <History className="h-3 w-3" />
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-80 p-3 bg-background border rounded-md shadow-md z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">
                      Histórico de Movimentação
                    </h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {todo.movementHistory.map((movement) => (
                        <div
                          key={movement.id}
                          className="text-xs border-l-2 border-border pl-2"
                        >
                          <div className="font-medium text-foreground">
                            {movement.movedBy.name} moveu de{" "}
                            {movement.fromColumn.name} para{" "}
                            {movement.toColumn.name}
                          </div>
                          <div className="text-muted-foreground">
                            {dayjs(movement.movedAt).format("DD/MM/YYYY HH:mm")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="flex flex-wrap gap-1 justify-end">
            {todo.tags.slice(0, 2).map((tag) => {
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
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TodoCard;
