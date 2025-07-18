import { Skeleton } from "../ui/skeleton";
import { TASK_STATE_OPTIONS } from "@/lib/const";
import { TodoEditRequest } from "@/lib/validators/todo";
import todoEditRequest from "@/requests/todoEditRequest";
import { Todo, Project } from "@prisma/client"; // Added Project
import { AxiosError } from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient, useQueries } from "@tanstack/react-query"; // Import useQueries
import DndContextProvider, { OnDragEndEvent } from "../DnDContextProvider";
import { useToast } from "../ui/use-toast";
import TodoColumn from "./TodoColumn";
import todoFetchRequest from "@/requests/todoFetchRequest";
// import projectColumnsFetchRequest from "@/requests/projectColumnsFetchRequest"; // Import new fetch function
// import { ProjectColumn as PrismaProjectColumn } from "@prisma/client"; // Alias to avoid name clash if any
import SkeletonColumn from "./SkeletonColumn";
import ViewToggle from "../ViewToggle";
import React, { useState } from "react"; // Import useState
import { Separator } from "../ui/separator";
import { TodoWithColumn } from "@/types/todo";
// import { Button } from "../ui/button"; // Import Button
// import { Input } from "../ui/input";
// import { PlusCircle } from "lucide-react";
// import projectColumnCreateRequest, { ProjectColumnCreatePayload } from "@/requests/projectColumnCreateRequest";
// import projectColumnDeleteRequest from "@/requests/projectColumnDeleteRequest"; // Import delete request
// import { useSession } from "next-auth/react"; // Import useSession

// Define a type for the grouped projects
interface GroupedProject {
  id: string;
  name: string;
  tasks: TodoWithColumn[]; // Use TodoWithColumn
}

const TodoColumnManager = () => {
  const router = useRouter();
  const { axiosToast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("q")?.toLowerCase() || "";
  const currentProjectId = searchParams.get("projectId") || "all";
  const viewMode = searchParams.get("view") || null;
  // const { data: session } = useSession(); // Get session

  // const [showAddColumnForm, setShowAddColumnForm] = useState(false);
  // const [newColumnName, setNewColumnName] = useState("");

  // Fetch Todos
  const { data: todos, isLoading: isLoadingTodos, error: errorTodos } = useQuery<TodoWithColumn[], Error>({
    queryKey: ["todos", { projectId: currentProjectId, viewMode }],
    queryFn: () => todoFetchRequest(currentProjectId === "all" ? null : currentProjectId, viewMode) as Promise<TodoWithColumn[]>, // Assert type
    onError: (err) => {
      // console.error("Error fetching todos:", err); // Log removido
      axiosToast(new AxiosError("Falha ao buscar tarefas."));
    },
  });

  const isLoading = isLoadingTodos;
  const error = errorTodos;

  const { mutate: handleUpdateState } = useMutation<
    TodoWithColumn, // Expect a single updated TodoWithColumn from the mutation function
    AxiosError,
    TodoEditRequest,
    { previousTodos?: TodoWithColumn[]; queryKey: any[] }
  >({
    mutationFn: async (data: TodoEditRequest) => {
      const updatedTodo = await todoEditRequest(data);
      return updatedTodo as TodoWithColumn; // Cast to TodoWithColumn
    },
    onMutate: async (payload: TodoEditRequest) => {
      const queryKey = ["todos", { projectId: currentProjectId, viewMode }];
      await queryClient.cancelQueries({ queryKey });

      const previousTodos = queryClient.getQueryData<TodoWithColumn[]>(queryKey);

      if (!previousTodos) {
        return { previousTodos: undefined, queryKey };
      }

      const todoToUpdate = previousTodos.find((todo) => todo.id === payload.id);
      if (!todoToUpdate) {
        return { previousTodos, queryKey };
      }

      const originalTodoState = JSON.parse(JSON.stringify(todoToUpdate)); // Deep clone for logging and reference

      // Determine new properties for the dragged todo
      const newProjectId = payload.projectId || originalTodoState.projectId;
      const newColumnId = payload.columnId!; // columnId must be present in payload for a move
      const newOrder = payload.order!;     // order must be present in payload

      let tempTodos = JSON.parse(JSON.stringify(previousTodos)) as TodoWithColumn[]; // Deep clone to avoid mutating cache directly

      // --- Step 1: Remove the item from its original position in tempTodos ---
      const itemIndex = tempTodos.findIndex(todo => todo.id === payload.id);
      if (itemIndex > -1) {
        tempTodos.splice(itemIndex, 1);
      }

      // --- Step 2: Adjust order in the source column (originalTodoState.columnId) ---
      if (originalTodoState.columnId !== newColumnId || originalTodoState.projectId !== newProjectId) {
        tempTodos = tempTodos.map(todo => {
          if (todo.projectId === originalTodoState.projectId &&
              todo.columnId === originalTodoState.columnId &&
              todo.order > originalTodoState.order) {
            return { ...todo, order: todo.order - 1 };
          }
          return todo;
        });
      }

      // --- Step 3: Adjust order in the destination column (newColumnId) ---
      tempTodos = tempTodos.map(todo => {
        if (todo.projectId === newProjectId &&
            todo.columnId === newColumnId &&
            todo.order >= newOrder) {
          return { ...todo, order: todo.order + 1 };
        }
        return todo;
      });

      // --- Step 4: Construct and add the updated item to its new position ---
      const updatedTodoItem: TodoWithColumn = {
        ...originalTodoState, // Base on a clone of the original item's full state
        projectId: newProjectId, // Override with new projectId
        columnId: newColumnId,   // Override with new columnId
        order: newOrder,         // Override with new order
        ...(payload.title && { title: payload.title }),
        ...(payload.description && { description: payload.description }),
        ...(payload.deadline && { deadline: payload.deadline }),
        ...(payload.label && { label: payload.label }),
        ...(payload.state && { state: payload.state }),
      };

      tempTodos.push(updatedTodoItem);

      // Sort the final list to ensure correct order for rendering
      tempTodos.sort((a, b) => {
        if (a.projectId && b.projectId && a.projectId !== b.projectId) {
          return a.projectId.localeCompare(b.projectId);
        }
        if (a.columnId && b.columnId && a.columnId !== b.columnId) {
          return a.columnId.localeCompare(b.columnId);
        }
        return a.order - b.order;
      });

      queryClient.setQueryData<TodoWithColumn[]>(queryKey, tempTodos);

      return { previousTodos, queryKey };
    },
    onError: (error, variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(context.queryKey, context.previousTodos);
      }
      axiosToast(error);
    },
    onSuccess: (updatedTodoFromServer, variables, context) => {
      queryClient.invalidateQueries({ queryKey: context.queryKey });

      const originalProjectId = context?.previousTodos?.find(t => t.id === variables.id)?.projectId;
      const newProjectId = updatedTodoFromServer.projectId;

      if (currentProjectId === "all") {
        if (originalProjectId && newProjectId && originalProjectId !== newProjectId) {
          queryClient.invalidateQueries({ queryKey: ["todos", { projectId: originalProjectId, viewMode }] });
          queryClient.invalidateQueries({ queryKey: ["todos", { projectId: newProjectId, viewMode }] });
        }
        const uniqueProjectIdsInCache = new Set(
          queryClient.getQueryData<TodoWithColumn[]>(context.queryKey)?.map(t => t.projectId).filter(Boolean)
        );
        uniqueProjectIdsInCache.add(originalProjectId ?? null); // ensure original is included
        uniqueProjectIdsInCache.add(newProjectId ?? null);      // ensure new is included
        uniqueProjectIdsInCache.forEach(pid => {
          if (pid) queryClient.invalidateQueries({ queryKey: ["todos", { projectId: pid, viewMode }] });
        });

      } else {
        if (newProjectId !== currentProjectId || (originalProjectId && originalProjectId !== currentProjectId)) {
          queryClient.invalidateQueries({ queryKey: ["todos", { projectId: "all", viewMode }] });
          if (newProjectId && newProjectId !== currentProjectId) {
            queryClient.invalidateQueries({ queryKey: ["todos", { projectId: newProjectId, viewMode }] });
          }
          if (originalProjectId && originalProjectId !== currentProjectId && originalProjectId !== newProjectId){
             queryClient.invalidateQueries({ queryKey: ["todos", { projectId: originalProjectId, viewMode }] });
          }
        } else {
          queryClient.invalidateQueries({ queryKey: ["todos", { projectId: "all", viewMode }] });
        }
      }
    },
  });

  const handleDragEnd = (dragEndEvent: OnDragEndEvent) => {
    const { over, item, order } = dragEndEvent;

    if (!over || !item || order === undefined || order === null) {
      return;
    }

    const draggedTodo = (todos ?? []).find(t => t.id === item);
    if (!draggedTodo) {
      return;
    }
    const originalProjectId = draggedTodo.projectId;

    const targetColumnId = over.toString();

    let targetProjectId = currentProjectId;

    if (currentProjectId === "all") {
      targetProjectId = originalProjectId;
    }

    const payload: TodoEditRequest = {
      id: item as string,
      columnId: targetColumnId,
      order,
      projectId: (targetProjectId && targetProjectId !== "all" && targetProjectId !== originalProjectId) ? targetProjectId : undefined,
    };

    handleUpdateState(payload);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center px-6 pt-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-2 overflow-x-auto p-6">
          <SkeletonColumn state="TODO" />
          <SkeletonColumn state="IN_PROGRESS" />
          <SkeletonColumn state="REVIEW" />
          <SkeletonColumn state="DONE" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-500">Erro ao carregar tarefas: {error.message}</div>;
  }

  const filteredTodos =
    (Array.isArray(todos) ? todos : []).filter((todo) => {
      if (!searchTerm) return true;
      const inTitle = todo.title?.toLowerCase().includes(searchTerm);
      const inDescription = todo.description?.toLowerCase().includes(searchTerm) ?? false;
      return inTitle || inDescription;
    });

  let pageTitle = "Todas as áreas";
  let singleProjectName: string | null = null;

  if (currentProjectId && currentProjectId !== "all") {
    const projectTodo = filteredTodos.find(todo => todo.project?.id === currentProjectId);
    if (projectTodo?.project?.name) {
      pageTitle = projectTodo.project.name;
      singleProjectName = projectTodo.project.name;
    } else {
      const projects = queryClient.getQueryData<Project[]>(["projects"]);
      const project = projects?.find(p => p.id === currentProjectId);
      if (project?.name) {
        pageTitle = project.name;
        singleProjectName = project.name;
      } else {
        pageTitle = "Projeto Desconhecido"; // Fallback
      }
    }
  }

  const groupedProjects: GroupedProject[] = [];
  if (currentProjectId === "all") {
    const projectsMap: Map<string, GroupedProject> = new Map();
    filteredTodos.forEach(todo => {
      if (todo.project) {
        if (!projectsMap.has(todo.project.id)) {
          projectsMap.set(todo.project.id, {
            id: todo.project.id,
            name: todo.project.name || "Projeto Sem Nome",
            tasks: [],
          });
        }
        projectsMap.get(todo.project.id)!.tasks.push(todo);
      }
    });
    groupedProjects.push(...Array.from(projectsMap.values()));
    groupedProjects.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex justify-between items-center px-6 pt-6">
        <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
        <div className="flex items-center gap-2">
          <ViewToggle />
        </div>
      </div>

      <DndContextProvider onDragEnd={handleDragEnd}>
        {currentProjectId !== "all" ? (
          <div className="flex gap-2 overflow-x-auto px-6">
            {TASK_STATE_OPTIONS.map(({ value, title }) => {
              const columnTodos = filteredTodos
                .filter((todo) => todo.columnId === value) 
                .sort((a, b) => a.order - b.order);
              return (
                <TodoColumn
                  key={value}
                  title={title}
                  todos={columnTodos}
                  columnId={value} 
                  projectId={currentProjectId} 
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groupedProjects.map((project, projectIndex) => {
              return (
                <div key={project.id} className="flex flex-col gap-3">
                  <h3 className="text-xl font-semibold px-6">{project.name}</h3>
                  <div className="flex gap-2 overflow-x-auto px-6">
                    {TASK_STATE_OPTIONS.map(({ value: taskStateValue, title: taskStateTitle }) => {
                      const projectColumnTodos = project.tasks
                        .filter((todo) => todo.columnId === taskStateValue)
                        .sort((a, b) => a.order - b.order);
                      return (
                        <TodoColumn
                          key={`${project.id}-${taskStateValue}`}
                          title={taskStateTitle}
                          todos={projectColumnTodos}
                          columnId={taskStateValue}
                          projectId={project.id}
                        />
                      );
                    })}
                  </div>
                  {projectIndex < groupedProjects.length - 1 && <Separator className="mt-4" />}
                </div>
              );
            })}
            {groupedProjects.length === 0 && !isLoading && (
              <p className="px-6 text-muted-foreground">Nenhum projeto ou tarefa encontrada para os filtros atuais.</p>
            )}
          </div>
        )}
      </DndContextProvider>
    </div>
  );
};

export default TodoColumnManager;


