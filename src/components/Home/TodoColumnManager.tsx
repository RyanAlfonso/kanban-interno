import { Skeleton } from "../ui/skeleton";
import { TASK_STATE_OPTIONS } from "@/lib/const";
import { TodoEditRequest } from "@/lib/validators/todo";
import todoEditRequest from "@/requests/todoEditRequest";
import { Todo, Project } from "@prisma/client"; // Added Project
import { AxiosError } from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import projectColumnCreateRequest, { ProjectColumnCreatePayload } from '@/requests/projectColumnCreateRequest'; // Import create request

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
    queryFn: () => projectColumnsFetchRequest(currentProjectId),
    enabled: currentProjectId !== "all", // Only fetch if a specific project is selected
    onError: (err) => {
      console.error(`Error fetching project columns for project ${currentProjectId}:`, err);
      // Optionally, show a toast for this error as well
      axiosToast(new AxiosError(`Falha ao buscar colunas do projeto ${currentProjectId}.`));
    },
  });

  const isLoading = isLoadingTodos || (currentProjectId !== "all" && isLoadingProjectColumns);
  const error = errorTodos || errorProjectColumns;

  // Mutation for creating a new project column
  const { mutate: createColumnMutation, isLoading: isCreatingColumn } = useMutation<
    PrismaProjectColumn, // Expected return type from the API
    AxiosError,          // Type of error
    { name: string; order: number; projectId: string }, // Variables passed to mutationFn
    { previousProjectColumns?: PrismaProjectColumn[] } // Context for optimistic updates
  >({
    mutationFn: async (variables) => {
      const { projectId, name, order } = variables;
      return projectColumnCreateRequest(projectId, { name, order });
    },
    onMutate: async (newColumnData) => {
      // Optimistic update:
      await queryClient.cancelQueries({ queryKey: ["projectColumns", { projectId: currentProjectId }] });
      const previousProjectColumns = queryClient.getQueryData<PrismaProjectColumn[]>(["projectColumns", { projectId: currentProjectId }]);

      if (previousProjectColumns) {
        // Create a temporary new column object for optimistic update
        // Note: The ID will be temporary until the actual response comes.
        // This might require careful handling if ID is used as key immediately.
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
    onSuccess: (data) => { // data is the newly created column from the server
      // Invalidate and refetch to ensure we have the correct ID and data from server
      queryClient.invalidateQueries({ queryKey: ["projectColumns", { projectId: currentProjectId }] });
      // Optionally, update the cache with the server response directly if optimistic ID is an issue
      // queryClient.setQueryData<PrismaProjectColumn[]>(["projectColumns", { projectId: currentProjectId }], (oldData) => {
      //   return [...(oldData || []).filter(col => !col.id.startsWith('optimistic-')), data].sort((a,b) => a.order - b.order);
      // });
    },
    onSettled: () => {
      setNewColumnName("");
      setShowAddColumnForm(false);
    }
  });

  const handleCreateColumn = (name: string) => {
    if (!name.trim() || currentProjectId === "all") return;
    const order = projectColumns ? projectColumns.length : 0; // Simple order assignment
    createColumnMutation({ name: name.trim(), order, projectId: currentProjectId });
  };


  const { mutate: handleUpdateState } = useMutation<
    TodoWithColumn[], // Use TodoWithColumn[]
    AxiosError,
    TodoEditRequest,
    { previousTodos?: TodoWithColumn[] } // Use TodoWithColumn[]
  >({
    mutationFn: async (data: TodoEditRequest) => {
      // The actual request function `todoEditRequest` returns a Promise<Todo> (from Prisma)
      // We need to ensure the optimistic update and the actual data match TodoWithColumn.
      // The API PUT /api/todo should return the updated Todo with its 'column' relation.
      // For now, we cast the result. If todoEditRequest doesn't return the 'column' relation,
      // this optimistic update might be missing it until refetch.
      const updatedTodo = await todoEditRequest(data);
      return updatedTodo as unknown as TodoWithColumn[]; // This is not ideal, mutationFn should align with query data type
      // A better approach would be for todoEditRequest to return TodoWithColumn or for the mutation
      // to handle the transformation or simply expect a single TodoWithColumn.
      // For now, this allows the optimistic update logic to proceed with TodoWithColumn[].
    },
    onMutate: async (payload: TodoEditRequest) => {
      console.log("onMutate handleUpdateState:", payload);
      const queryKey = ["todos", { projectId: currentProjectId, viewMode }];
      await queryClient.cancelQueries({ queryKey });

      const previousTodos = queryClient.getQueryData<TodoWithColumn[]>(queryKey); // Use TodoWithColumn[]
      console.log("Previous todos (update state):", previousTodos);

      if (!previousTodos) return { previousTodos: undefined };

      const originalTodo = previousTodos.find((todo) => todo.id === payload.id);
      if (!originalTodo) return { previousTodos };

      // Use columnId from payload and originalTodo
      const originalColumnId = originalTodo.columnId;
      const originalOrder = originalTodo.order;
      const newProjectId = payload.projectId || originalTodo.projectId; // projectId might change
      const newColumnId = payload.columnId!; // Should always be present if this mutation is for column change
      const newOrder = payload.order!; // Should always be present

      console.log(`Optimistic Update: Todo ${originalTodo.id} from P:${originalTodo.projectId} Col:${originalColumnId} O:${originalOrder} to P:${newProjectId} Col:${newColumnId} O:${newOrder}`);

      const updatedTodos = previousTodos.map(currentIteratedTodo => {
        let updatedIteratedTodo = { ...currentIteratedTodo }; // Clone to avoid direct mutation

        // 1. Update the dragged item itself
        if (updatedIteratedTodo.id === payload.id) {
          updatedIteratedTodo.columnId = newColumnId;
          updatedIteratedTodo.order = newOrder;
          updatedIteratedTodo.projectId = newProjectId;
          // If todo.column (the actual object) is part of the optimistic data, update it too.
          // This depends on if `projectColumns` data is readily available here or if `todo.column` is fetched.
          // For simplicity, we'll rely on query invalidation to get the correct `todo.column` object later.
          console.log(`  - Dragged item ${updatedIteratedTodo.id} updated to P:${updatedIteratedTodo.projectId} Col:${updatedIteratedTodo.columnId} O:${updatedIteratedTodo.order}`);
        } else {
          // 2. Adjust order in the source column (original project, original columnId)
          //    If item moved out of this column (either columnId or project changed)
          if (updatedIteratedTodo.projectId === originalTodo.projectId &&
              updatedIteratedTodo.columnId === originalColumnId &&
              updatedIteratedTodo.order > originalOrder) {
            updatedIteratedTodo.order -= 1;
            console.log(`  - Source column adjustment (decrement): ${updatedIteratedTodo.id} O:${currentIteratedTodo.order} -> ${updatedIteratedTodo.order} (in P:${updatedIteratedTodo.projectId} Col:${updatedIteratedTodo.columnId})`);
          }

          // 3. Adjust order in the destination column (new project, new columnId)
          //    If item moved into this column (either columnId or project changed)
          //    And this 'currentIteratedTodo' is not the item being dragged
          if (updatedIteratedTodo.projectId === newProjectId &&
              updatedIteratedTodo.columnId === newColumnId &&
              updatedIteratedTodo.order >= newOrder) {
            updatedIteratedTodo.order += 1;
            console.log(`  - Dest column adjustment (increment): ${updatedIteratedTodo.id} O:${currentIteratedTodo.order} -> ${updatedIteratedTodo.order} (in P:${updatedIteratedTodo.projectId} Col:${updatedIteratedTodo.columnId})`);
          }
        }
        return updatedIteratedTodo;
      });

      // Sort for consistent optimistic update rendering
      // Sort by projectId, then columnId, then order
      queryClient.setQueryData<Todo[]>(queryKey, updatedTodos.sort((a, b) => {
        if (a.projectId !== b.projectId) return (a.projectId || "").localeCompare(b.projectId || "");
        if (a.columnId !== b.columnId) return (a.columnId || "").localeCompare(b.columnId || "");
        return a.order - b.order;
      }));

      return { previousTodos };
    },
    onError: (error, variables, context) => {
      console.error("onError handleUpdateState:", error);
      if (context?.previousTodos) {
        queryClient.setQueryData(["todos", { projectId: currentProjectId, viewMode }], context.previousTodos);
      }
      axiosToast(error);
    },
    onSuccess: () => {
      // Invalidate to refetch and ensure consistency, especially with ordering and project data across multiple projects
      queryClient.invalidateQueries({ queryKey: ["todos", { projectId: currentProjectId, viewMode }] });
      if (currentProjectId === "all") { // If viewing all projects, also invalidate individual project queries
        const uniqueProjectIds = new Set(queryClient.getQueryData<Todo[]>(["todos", { projectId: currentProjectId, viewMode }])?.map(t => t.projectId));
        uniqueProjectIds.forEach(pid => {
          if (pid) queryClient.invalidateQueries({ queryKey: ["todos", { projectId: pid, viewMode }] });
        });
      } else { // If viewing a single project, and a task might have moved out, invalidate "all"
         queryClient.invalidateQueries({ queryKey: ["todos", { projectId: "all", viewMode }] });
      }

    },
  });

  const handleDragEnd = (dragEndEvent: OnDragEndEvent) => {
    console.log("handleDragEnd event:", dragEndEvent);
    const { over, item, order } = dragEndEvent; // 'over' is the droppableId, 'item' is the draggableId (todo.id)

    if (!over || !item || order === undefined || order === null) {
      console.warn("Invalid drag end event data:", dragEndEvent);
      return;
    }

    const draggedTodo = todos?.find(t => t.id === item);
    if (!draggedTodo) {
      console.error("Dragged todo not found:", item);
      return;
    }
    const originalProjectId = draggedTodo.projectId;
    const originalColumnId = draggedTodo.columnId; // Get original columnId

    // 'over' is now the target columnId (string)
    const targetColumnId = over.toString();

    // Determine targetProjectId:
    // In single project view, targetProjectId is currentProjectId.
    // In "all projects" view, the targetColumnId should belong to a project.
    // We need to find the project for the targetColumnId if in "all projects" view.
    // This part is complex for "all projects" view and will need further refinement
    // when that view is updated to use dynamic columns.
    // For now, assuming single project view or that targetColumnId is sufficient.

    let targetProjectId = currentProjectId; // Assume single project view initially

    if (currentProjectId === "all") {
        // This logic is tricky because a columnId is globally unique.
        // We need to find which project this targetColumnId belongs to.
        // This requires projectColumns to be fetched and available for all projects,
        // or the TodoColumn needs to provide more context on drop.
        // For now, this part will be INCOMPLETE for "all" view until it's refactored.
        // A temporary approach might be to find the target column in the *flattened* list of all columns
        // if we had such a list, or rely on optimistic update issues for "all" view.
        // For now, if a task is moved in "all" view, its projectId might not update correctly without more info.
        console.warn("Drag-and-drop in 'All Projects' view with dynamic columns needs specific logic to determine target project. Current implementation may be incomplete for this view.");
        // A placeholder: try to find the target column in the *current* set of todos to infer project
        const targetColumnDetails = projectColumns?.find(pc => pc.id === targetColumnId); // This is only for current project if single view
        if (targetColumnDetails) {
            targetProjectId = targetColumnDetails.projectId;
        } else {
            // Fallback or error: if we can't determine the target project in "all" view.
            // For now, we might incorrectly assign it to its original project or fail.
            // This part needs the "All Projects View" to be refactored to use dynamic columns.
            targetProjectId = originalProjectId; // Fallback, likely incorrect for inter-project moves
        }
    }


    console.log(`Drag End: Item ${item} (Proj: ${originalProjectId}, Col: ${originalColumnId}) dropped on TargetColId: ${targetColumnId}. Target Proj: ${targetProjectId}, Order: ${order}`);

    const payload: TodoEditRequest = {
      id: item as string,
      columnId: targetColumnId, // Use columnId
      order,
      // projectId update logic: send projectId if it's different from original.
      // This is complex if targetProjectId couldn't be reliably determined in "all" view.
      projectId: targetProjectId && targetProjectId !== originalProjectId ? targetProjectId : undefined,
      // Ensure other fields are not unintentionally blanked
      // title: undefined, // Example: only send fields that change
      // deadline: undefined,
      // label: undefined,
    };

    console.log("Calling handleUpdateState with payload:", payload);
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
    todos?.filter((todo) => {
      if (!searchTerm) return true;
      const inTitle = todo.title?.toLowerCase().includes(searchTerm);
      const inDescription = todo.description?.toLowerCase().includes(searchTerm) ?? false;
      return inTitle || inDescription;
    }) ?? [];
  console.log(`Filtered Todos (${filteredTodos.length}):`, filteredTodos);

  let pageTitle = "Todas as áreas";
  let singleProjectName: string | null = null;

  if (currentProjectId && currentProjectId !== "all") {
    const projectTodo = filteredTodos.find(todo => todo.project?.id === currentProjectId);
    if (projectTodo?.project?.name) {
      pageTitle = projectTodo.project.name;
      singleProjectName = projectTodo.project.name;
    } else {
      // Attempt to get project name from queryClient cache if no todos for it yet
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

  // Group todos by project if "Todas as áreas" is selected
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
    // Sort projects by name
    groupedProjects.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div className="flex flex-col gap-4 pb-6"> {/* Added pb-6 for bottom padding */}
      <div className="flex justify-between items-center px-6 pt-6">
        <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
        <div className="flex items-center gap-2">
          <ViewToggle />
        </div>
      </div>

      <DndContextProvider onDragEnd={handleDragEnd}>
        {currentProjectId !== "all" ? (
          // Single Project View
          <div className="flex gap-2 overflow-x-auto px-6">
            {projectColumns && projectColumns.sort((a,b) => a.order - b.order).map((column) => { // Iterate over fetched projectColumns
              const columnTodos = filteredTodos
                .filter((todo) => todo.columnId === column.id) // Filter todos by column.id
                .sort((a, b) => a.order - b.order);
              return (
                <TodoColumn
                  key={column.id}
                  title={column.name} // Use column.name
                  todos={columnTodos}
                  // state={value} // state prop is no longer needed by TodoColumn if it uses columnId
                  columnId={column.id} // Pass column.id
                  projectId={currentProjectId} // Pass currentProjectId
                />
              );
            })}
            {/* Placeholder for Add New Column button - to be implemented in Phase 2 */}
            {/* {projectColumns && !isLoadingProjectColumns && (
              <div className="min-w-[280px] w-[280px] flex-shrink-0">
                <button className="w-full p-2 bg-gray-200 hover:bg-gray-300 rounded-md">
                  + Add New Column
                </button>
              </div>
            )} */}
            {/* Add New Column Form/Button - Only in Single Project View and if not loading columns */}
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
          // All Projects View - This part will also need refactoring later
          // For now, it still uses TASK_STATE_OPTIONS and todo.state
          // This will be addressed after single project view is fully working with dynamic columns
          <div className="flex flex-col gap-6">
            {groupedProjects.map((project, projectIndex) => (
              <div key={project.id} className="flex flex-col gap-3">
                <h3 className="text-xl font-semibold px-6">{project.name}</h3>
                <div className="flex gap-2 overflow-x-auto px-6">
                  {TASK_STATE_OPTIONS.map(({ value: taskStateValue, title: taskStateTitle }) => {
                    const projectColumnTodos = project.tasks
                      .filter((todo) => todo.state === taskStateValue)
                      .sort((a, b) => a.order - b.order);
                    return (
                      <TodoColumn
                        key={`${project.id}-${taskStateValue}`}
                        title={taskStateTitle}
                        todos={projectColumnTodos}
                        state={taskStateValue}
                        projectId={project.id} // Pass the project.id to TodoColumn
                      />
                    );
                  })}
                </div>
                {projectIndex < groupedProjects.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
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

