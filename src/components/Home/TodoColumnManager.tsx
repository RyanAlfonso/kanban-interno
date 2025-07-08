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
import projectColumnsFetchRequest from "@/requests/projectColumnsFetchRequest"; // Import new fetch function
import { ProjectColumn as PrismaProjectColumn } from "@prisma/client"; // Alias to avoid name clash if any
import SkeletonColumn from "./SkeletonColumn";
import ViewToggle from "../ViewToggle";
import React, { useState } from 'react'; // Import useState
import { Separator } from "../ui/separator";
import { TodoWithColumn } from "@/types/todo";
import { Button } from '../ui/button'; // Import Button
import { Input } from '../ui/input';
import { PlusCircle } from 'lucide-react';
import projectColumnCreateRequest, { ProjectColumnCreatePayload } from '@/requests/projectColumnCreateRequest';
import projectColumnDeleteRequest from '@/requests/projectColumnDeleteRequest'; // Import delete request

// Define a type for the grouped projects
interface GroupedProject {
  id: string;
  name: string;
  tasks: TodoWithColumn[]; // Use TodoWithColumn
}

const TodoColumnManager = () => {
  console.log("Rendering TodoColumnManager...");
  const router = useRouter();
  const { axiosToast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("q")?.toLowerCase() || "";
  const currentProjectId = searchParams.get("projectId") || "all";
  const viewMode = searchParams.get("view") || null;

  const [showAddColumnForm, setShowAddColumnForm] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  // Fetch Todos
  const { data: todos, isLoading: isLoadingTodos, error: errorTodos } = useQuery<TodoWithColumn[], Error>({ // Use TodoWithColumn[]
    queryKey: ["todos", { projectId: currentProjectId, viewMode }],
    queryFn: () => todoFetchRequest(currentProjectId === "all" ? null : currentProjectId, viewMode) as Promise<TodoWithColumn[]>, // Assert type
    onError: (err) => {
      console.error("Error fetching todos:", err);
      axiosToast(new AxiosError("Falha ao buscar tarefas."));
    },
  });

  // Fetch Project Columns if a specific project is selected
  const { data: projectColumns, isLoading: isLoadingProjectColumns, error: errorProjectColumns } = useQuery<PrismaProjectColumn[], Error>({
    queryKey: ["projectColumns", { projectId: currentProjectId }],
    queryFn: () => {
      if (currentProjectId === "all") {
        // This specific query instance for 'all' should not run if we are using useQueries below.
        // Or, it could fetch some summary data if needed, but not individual columns.
        // For now, return undefined or an empty array as it's handled by allProjectsColumnsQueries.
        return Promise.resolve(undefined);
      }
      return projectColumnsFetchRequest(currentProjectId);
    },
    enabled: currentProjectId !== "all",
    onError: (err) => {
      console.error(`Error fetching project columns for project ${currentProjectId}:`, err);
      axiosToast(new AxiosError(`Falha ao buscar colunas do projeto ${currentProjectId}.`));
    },
  });

  const uniqueProjectIdsFromTodos = (currentProjectId === 'all' && todos)
    ? Array.from(new Set(todos.map(todo => todo.projectId).filter((id): id is string => !!id)))
    : [];

  const allProjectsColumnsQueries = useQueries({
    queries: (currentProjectId === 'all' && todos && uniqueProjectIdsFromTodos.length > 0)
      ? uniqueProjectIdsFromTodos.map(projId => ({
          queryKey: ["projectColumns", { projectId: projId }],
          queryFn: () => projectColumnsFetchRequest(projId),
          // staleTime: 5 * 60 * 1000, // Optional: cache for 5 minutes
        }))
      : [], // Ensure empty array if not applicable, to prevent useQueries error
  });

  const allProjectsColumnsMap = React.useMemo(() => {
    const map: Record<string, PrismaProjectColumn[]> = {};
    if (currentProjectId === 'all') {
      allProjectsColumnsQueries.forEach((queryResult, index) => {
        if (queryResult.data && uniqueProjectIdsFromTodos[index]) {
          map[uniqueProjectIdsFromTodos[index]] = queryResult.data.sort((a,b)=>a.order - b.order);
        }
      });
    }
    return map;
  }, [currentProjectId, allProjectsColumnsQueries, uniqueProjectIdsFromTodos]);

  const isLoadingAllProjectsColumns = currentProjectId === 'all' ? allProjectsColumnsQueries.some(q => q.isLoading) : false;
  const errorAllProjectsColumns = currentProjectId === 'all' ? (allProjectsColumnsQueries.find(q => q.error)?.error as Error | null) : null;

  const isLoading = isLoadingTodos ||
                  (currentProjectId !== "all" && isLoadingProjectColumns) ||
                  isLoadingAllProjectsColumns;

  const error = errorTodos ||
                (currentProjectId !== "all" ? errorProjectColumns : null) ||
                errorAllProjectsColumns;

  const { mutate: createColumnMutation, isLoading: isCreatingColumn } = useMutation<
    PrismaProjectColumn,
    AxiosError,         
    { name: string; order: number; projectId: string },
    { previousProjectColumns?: PrismaProjectColumn[] }
  >({
    mutationFn: async (variables) => {
      const { projectId, name, order } = variables;
      return projectColumnCreateRequest(projectId, { name, order });
    },
    onMutate: async (newColumnData) => {
      await queryClient.cancelQueries({ queryKey: ["projectColumns", { projectId: currentProjectId }] });
      const previousProjectColumns = queryClient.getQueryData<PrismaProjectColumn[]>(["projectColumns", { projectId: currentProjectId }]);

      if (previousProjectColumns) {
        const optimisticColumn: PrismaProjectColumn = {
          id: `optimistic-${Date.now()}`, // Temporary ID
          name: newColumnData.name,
          order: newColumnData.order,
          projectId: newColumnData.projectId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        queryClient.setQueryData<PrismaProjectColumn[]>(
          ["projectColumns", { projectId: currentProjectId }],
          [...previousProjectColumns, optimisticColumn].sort((a,b) => a.order - b.order)
        );
      }
      return { previousProjectColumns };
    },
    onError: (err, newColumn, context) => {
      if (context?.previousProjectColumns) {
        queryClient.setQueryData(["projectColumns", { projectId: currentProjectId }], context.previousProjectColumns);
      }
      axiosToast(new AxiosError(`Falha ao criar coluna: ${err.response?.data || err.message}`));
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projectColumns", { projectId: currentProjectId }] });
    },
    onSettled: () => {
      setNewColumnName("");
      setShowAddColumnForm(false);
    }
  });

  const handleCreateColumn = (name: string) => {
    if (!name.trim() || currentProjectId === "all") return;
    const order = projectColumns ? projectColumns.length : 0;
    createColumnMutation({ name: name.trim(), order, projectId: currentProjectId });
  };

  const { mutate: deleteColumnMutation, isLoading: isDeletingColumn } = useMutation<
    PrismaProjectColumn,
    AxiosError,
    string,
    { previousProjectColumns?: PrismaProjectColumn[] }
  >({
    mutationFn: (columnId: string) => projectColumnDeleteRequest(columnId),
    onMutate: async (columnIdToDelete) => {
      await queryClient.cancelQueries({ queryKey: ["projectColumns", { projectId: currentProjectId }] });
      const previousProjectColumns = queryClient.getQueryData<PrismaProjectColumn[]>(["projectColumns", { projectId: currentProjectId }]);

      if (previousProjectColumns) {
        queryClient.setQueryData<PrismaProjectColumn[]>(
          ["projectColumns", { projectId: currentProjectId }],
          previousProjectColumns.filter(column => column.id !== columnIdToDelete)
        );
      }
      return { previousProjectColumns };
    },
    onError: (err, columnId, context) => {
      if (context?.previousProjectColumns) {
        queryClient.setQueryData(["projectColumns", { projectId: currentProjectId }], context.previousProjectColumns);
      }
      axiosToast(new AxiosError(`Falha ao excluir coluna: ${err.response?.data || err.message}`));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projectColumns", { projectId: currentProjectId }] });
      // Also invalidate todos query as some todos might have their columnId set to null
      queryClient.invalidateQueries({ queryKey: ["todos", { projectId: currentProjectId, viewMode }] });
      if (currentProjectId === 'all') { // If on all projects view, also invalidate todos for "all"
          queryClient.invalidateQueries({ queryKey: ["todos", { projectId: "all", viewMode }] });
      }
    },
  });

  const handleDeleteColumn = (columnId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta coluna? As tarefas nesta coluna ficarão desassociadas.")) {
      if (currentProjectId === "all") {
        console.warn("Delete column initiated from 'all projects' view. Ensure context is correct.");
        let ownerProjectId: string | undefined;
        for (const projId in allProjectsColumnsMap) {
            if (allProjectsColumnsMap[projId].some(col => col.id === columnId)) {
                ownerProjectId = projId;
                break;
            }
        }
        if (ownerProjectId) {
             // TODO: Refactor onMutate/onError for delete to accept dynamic projectId for cache updates.
             // For now, this optimistic update might only work well if currentProjectId is the ownerProjectId.
            deleteColumnMutation(columnId);
        } else {
            axiosToast(new AxiosError("Não foi possível identificar o projeto da coluna para exclusão."));
        }
      } else {
        deleteColumnMutation(columnId);
      }
    }
  };


  const { mutate: handleUpdateState } = useMutation<
    TodoWithColumn, // Expect a single updated TodoWithColumn from the mutation function
    AxiosError,
    TodoEditRequest,
    { previousTodos?: TodoWithColumn[]; queryKey: any[] }
  >({
    mutationFn: async (data: TodoEditRequest) => {
      // todoEditRequest should return the updated todo, ideally with project/column relations (TodoWithColumn)
      // If it doesn't, the backend API /api/todo (PUT) needs to be updated to return the full object.
      // For now, we assume todoEditRequest returns at least Todo, and we'll cast to TodoWithColumn.
      // This relies on the backend returning the necessary fields for TodoWithColumn.
      const updatedTodo = await todoEditRequest(data);
      return updatedTodo as TodoWithColumn; // Cast to TodoWithColumn
    },
    onMutate: async (payload: TodoEditRequest) => {
      console.log("[TodoColumnManager] onMutate: init", JSON.parse(JSON.stringify(payload)));
      const queryKey = ["todos", { projectId: currentProjectId, viewMode }];
      await queryClient.cancelQueries({ queryKey });

      const previousTodos = queryClient.getQueryData<TodoWithColumn[]>(queryKey);
      console.log("[TodoColumnManager] onMutate: previousTodos", JSON.parse(JSON.stringify(previousTodos)));

      if (!previousTodos) {
        console.warn("[TodoColumnManager] onMutate: No previousTodos found in cache.");
        return { previousTodos: undefined, queryKey };
      }

      const todoToUpdate = previousTodos.find((todo) => todo.id === payload.id);
      if (!todoToUpdate) {
        console.warn("[TodoColumnManager] onMutate: todoToUpdate not found in previousTodos. ID:", payload.id);
        return { previousTodos, queryKey };
      }

      const originalTodoState = JSON.parse(JSON.stringify(todoToUpdate)); // Deep clone for logging and reference
      console.log("[TodoColumnManager] onMutate: originalTodoState of the dragged item", originalTodoState);

      // Determine new properties for the dragged todo
      const newProjectId = payload.projectId || originalTodoState.projectId;
      const newColumnId = payload.columnId!; // columnId must be present in payload for a move
      const newOrder = payload.order!;     // order must be present in payload

      console.log(`[TodoColumnManager] onMutate: Optimistic Update Params:
        Todo ID: ${originalTodoState.id}
        Original Project ID: ${originalTodoState.projectId}, Original Column ID: ${originalTodoState.columnId}, Original Order: ${originalTodoState.order}
        New Project ID: ${newProjectId}, New Column ID: ${newColumnId}, New Order: ${newOrder}`);

      let tempTodos = JSON.parse(JSON.stringify(previousTodos)) as TodoWithColumn[]; // Deep clone to avoid mutating cache directly

      // --- Step 1: Remove the item from its original position in tempTodos ---
      const itemIndex = tempTodos.findIndex(todo => todo.id === payload.id);
      if (itemIndex > -1) {
        tempTodos.splice(itemIndex, 1);
      }
      console.log("[TodoColumnManager] onMutate: tempTodos after removing item", JSON.parse(JSON.stringify(tempTodos)));


      // --- Step 2: Adjust order in the source column (originalTodoState.columnId) ---
      //    Only if the item actually moved out of this column or project.
      //    Items that were after the dragged item in the source column get their order decremented.
      if (originalTodoState.columnId !== newColumnId || originalTodoState.projectId !== newProjectId) {
        tempTodos = tempTodos.map(todo => {
          if (todo.projectId === originalTodoState.projectId &&
              todo.columnId === originalTodoState.columnId &&
              todo.order > originalTodoState.order) {
            return { ...todo, order: todo.order - 1 };
          }
          return todo;
        });
        console.log("[TodoColumnManager] onMutate: tempTodos after adjusting source column", JSON.parse(JSON.stringify(tempTodos)));
      }

      // --- Step 3: Adjust order in the destination column (newColumnId) ---
      //    Items at or after the newOrder in the destination column get their order incremented.
      //    This must happen *before* inserting the new item if we were inserting into the same array.
      //    But since we removed it first, we adjust based on newOrder.
      tempTodos = tempTodos.map(todo => {
        if (todo.projectId === newProjectId &&
            todo.columnId === newColumnId &&
            todo.order >= newOrder) {
          // Ensure we don't increment the order of the item being moved if it was already in this column
          // (though it's removed, this is a safeguard for logic)
          // if (todo.id === payload.id) return todo; // Item is already removed
          return { ...todo, order: todo.order + 1 };
        }
        return todo;
      });
      console.log("[TodoColumnManager] onMutate: tempTodos after adjusting destination column", JSON.parse(JSON.stringify(tempTodos)));

      // --- Step 4: Construct and add the updated item to its new position ---
      const updatedTodoItem: TodoWithColumn = {
        ...originalTodoState, // Base on a clone of the original item's full state
        projectId: newProjectId, // Override with new projectId
        columnId: newColumnId,   // Override with new columnId
        order: newOrder,         // Override with new order
        // Override other direct payload properties if they exist (e.g. title, if editable via D&D somehow)
        ...(payload.title && { title: payload.title }),
        ...(payload.description && { description: payload.description }),
        ...(payload.deadline && { deadline: payload.deadline }),
        ...(payload.label && { label: payload.label }),
        ...(payload.state && { state: payload.state }), // Keep existing state if not changed by payload
      };

      // Simplification: Removed optimistic update of .project and .column objects.
      // We will rely on the server refetch to get the correct associated objects.
      // The updatedTodoItem will have the correct IDs (projectId, columnId).
      console.log("[TodoColumnManager] onMutate: updatedTodoItem to be inserted (project/column objects will be updated on refetch)", JSON.parse(JSON.stringify(updatedTodoItem)));

      tempTodos.push(updatedTodoItem);
      console.log("[TodoColumnManager] onMutate: tempTodos after adding updated item", JSON.parse(JSON.stringify(tempTodos)));

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
      console.log("[TodoColumnManager] onMutate: tempTodos final before setQueryData", JSON.parse(JSON.stringify(tempTodos)));

      queryClient.setQueryData<TodoWithColumn[]>(queryKey, tempTodos);

      return { previousTodos, queryKey };
    },
    onError: (error, variables, context) => {
      console.error("onError handleUpdateState:", error);
      if (context?.previousTodos) {
        queryClient.setQueryData(context.queryKey, context.previousTodos);
      }
      axiosToast(error);
    },
    onSuccess: (updatedTodoFromServer, variables, context) => {
      console.log("[TodoColumnManager] onSuccess: Raw updatedTodoFromServer from API", JSON.parse(JSON.stringify(updatedTodoFromServer)));
      console.log("[TodoColumnManager] onSuccess: Variables sent to mutation", JSON.parse(JSON.stringify(variables)));
      console.log("[TodoColumnManager] onSuccess: Context", JSON.parse(JSON.stringify(context)));


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
    console.log("handleDragEnd event:", dragEndEvent);
    const { over, item, order } = dragEndEvent;

    if (!over || !item || order === undefined || order === null) {
      console.warn("Invalid drag end event data:", dragEndEvent);
      return;
    }

    const draggedTodo = (todos ?? []).find(t => t.id === item);
    if (!draggedTodo) {
      console.error("Dragged todo not found:", item);
      return;
    }
    const originalProjectId = draggedTodo.projectId;
    const originalColumnId = draggedTodo.columnId;

    const targetColumnId = over.toString();


    let targetProjectId = currentProjectId;

    if (currentProjectId === "all") {
      // Find the project ID for the target column from allProjectsColumnsMap
      let foundProjectForColumn = false;
      for (const projId in allProjectsColumnsMap) {
        if (allProjectsColumnsMap[projId].some(col => col.id === targetColumnId)) {
          targetProjectId = projId;
          foundProjectForColumn = true;
          break;
        }
      }
      if (!foundProjectForColumn) {
        console.error(`Could not find project for targetColumnId: ${targetColumnId} in 'all projects' view. Drag operation aborted.`);
        targetProjectId = originalProjectId;
        console.warn(`Target project for column ${targetColumnId} not definitively found in allProjectsColumnsMap. Defaulting to original project ${originalProjectId}. This might be incorrect.`);
      }
    }


    console.log(`Drag End: Item ${item} (Original Proj: ${originalProjectId}, Original Col: ${originalColumnId}) dropped on TargetColId: ${targetColumnId}. Determined Target Proj: ${targetProjectId}, Order: ${order}`);

    const payload: TodoEditRequest = {
      id: item as string,
      columnId: targetColumnId,
      order,
      projectId: (targetProjectId && targetProjectId !== "all" && targetProjectId !== originalProjectId) ? targetProjectId : undefined,
    };

    console.log("Calling handleUpdateState with payload:", payload);
    console.log("[TodoColumnManager] handleDragEnd: Payload for handleUpdateState", JSON.parse(JSON.stringify(payload)));
    handleUpdateState(payload);
  };

  if (isLoading) {
    console.log("TodoColumnManager loading...");
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
    console.error("TodoColumnManager render error:", error);
    return <div className="p-6 text-red-500">Erro ao carregar tarefas: {error.message}</div>;
  }

  const filteredTodos =
    (Array.isArray(todos) ? todos : []).filter((todo) => {
      if (!searchTerm) return true;
      const inTitle = todo.title?.toLowerCase().includes(searchTerm);
      const inDescription = todo.description?.toLowerCase().includes(searchTerm) ?? false;
      return inTitle || inDescription;
    });
  console.log(`Filtered Todos (${filteredTodos.length}):`, filteredTodos);

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
            {(Array.isArray(projectColumns) ? [...projectColumns] : []).sort((a,b) => a.order - b.order).map((column) => {
              const columnTodos = filteredTodos
                .filter((todo) => todo.columnId === column.id) 
                .sort((a, b) => a.order - b.order);
              return (
                <TodoColumn
                  key={column.id}
                  title={column.name}
                  todos={columnTodos}
                  columnId={column.id} 
                  projectId={currentProjectId} 
                  onDeleteColumn={handleDeleteColumn} 
                />
              );
            })}
            {currentProjectId !== "all" && !isLoadingProjectColumns && (
              <div className="min-w-[280px] w-[280px] flex-shrink-0 p-1">
                {showAddColumnForm ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCreateColumn(newColumnName); // Call the actual handler
                    }}
                    className="p-2 bg-slate-200 dark:bg-slate-700 rounded-md space-y-2"
                  >
                    <Input
                      type="text"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      placeholder="Nome da Coluna"
                      className="bg-white dark:bg-slate-800"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddColumnForm(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" size="sm" disabled={!newColumnName.trim()}>
                        Adicionar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-dashed hover:bg-slate-200 dark:hover:bg-slate-700"
                    onClick={() => setShowAddColumnForm(true)}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Adicionar Nova Coluna
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groupedProjects.map((project, projectIndex) => {
              const currentProjectDynamicColumns = allProjectsColumnsMap[project.id] || [];
              return (
                <div key={project.id} className="flex flex-col gap-3">
                  <h3 className="text-xl font-semibold px-6">{project.name}</h3>
                  <div className="flex gap-2 overflow-x-auto px-6">
                    {currentProjectDynamicColumns.length > 0 ? (
                      currentProjectDynamicColumns.map((column) => {
                        const projectColumnTodos = project.tasks
                          .filter((todo) => todo.columnId === column.id)
                          .sort((a, b) => a.order - b.order);
                        return (
                          <TodoColumn
                            key={column.id}
                            title={column.name}
                            todos={projectColumnTodos}
                            columnId={column.id}
                            projectId={project.id}
                            onDeleteColumn={handleDeleteColumn}
                          />
                        );
                      })
                    ) : (
                      allProjectsColumnsQueries.find(q => {
                        return q && q.queryKey && q.queryKey[1] && (q.queryKey[1] as { projectId: string }).projectId === project.id;
                      })?.isLoading
                        ? <p className="px-2 text-muted-foreground">Carregando colunas...</p>
                        : <p className="px-2 text-muted-foreground">Nenhuma coluna definida para este projeto.</p>
                    )}
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

