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
import SkeletonColumn from "./SkeletonColumn";
import ViewToggle from "../ViewToggle";
import { Separator } from "../ui/separator"; // Added Separator

// Define a type for the grouped projects
interface GroupedProject {
  id: string;
  name: string;
  tasks: Todo[];
}

const TodoColumnManager = () => {
  console.log("Rendering TodoColumnManager...");
  const router = useRouter();
  const { axiosToast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("q")?.toLowerCase() || "";
  const currentProjectId = searchParams.get("projectId") || "all"; // Renamed for clarity, default to "all"
  const viewMode = searchParams.get("view") || null;

  const { data: todos, isLoading, error } = useQuery<Todo[], Error>({
    queryKey: ["todos", { projectId: currentProjectId, viewMode }], // Use currentProjectId
    queryFn: () => todoFetchRequest(currentProjectId === "all" ? null : currentProjectId, viewMode), // Pass null if "all"
    onError: (err) => {
      console.error("Error fetching todos:", err);
      axiosToast(new AxiosError("Falha ao buscar tarefas."));
    },
  });

  const { mutate: handleUpdateState } = useMutation<
    Todo[],
    AxiosError,
    TodoEditRequest,
    { previousTodos?: Todo[] }
  >({
    mutationFn: todoEditRequest,
    onMutate: async (payload: TodoEditRequest) => {
      console.log("onMutate handleUpdateState:", payload);
      const queryKey = ["todos", { projectId: currentProjectId, viewMode }];
      await queryClient.cancelQueries({ queryKey });

      const previousTodos = queryClient.getQueryData<Todo[]>(queryKey);
      console.log("Previous todos (update state):", previousTodos);

      if (!previousTodos) return { previousTodos: undefined };

      const originalTodo = previousTodos.find((todo) => todo.id === payload.id);
      if (!originalTodo) return { previousTodos };

      const originalState = originalTodo.state;
      const originalOrder = originalTodo.order;
      // payload.projectId might be undefined if not changing project; fall back to originalTodo.projectId
      const newProjectId = payload.projectId || originalTodo.projectId;
      const newState = payload.state!; // Should always be present
      const newOrder = payload.order!; // Should always be present

      console.log(`Optimistic Update: Todo ${originalTodo.id} from P:${originalTodo.projectId} S:${originalState} O:${originalOrder} to P:${newProjectId} S:${newState} O:${newOrder}`);

      const isProjectChanging = newProjectId !== originalTodo.projectId;

      const updatedTodos = previousTodos.map(todo => {
        // Default: return todo as is
        let updatedTodo = todo;

        // 1. Update the dragged item itself
        if (todo.id === payload.id) {
          updatedTodo = { ...todo, state: newState, order: newOrder, projectId: newProjectId };
          // If project is changing, we also need to update the project object if it's embedded
          // This depends on whether the `todo.project` field is deeply fetched or just an ID.
          // Assuming `todo.project` might be stale if we just change `projectId`.
          // For now, we only update projectId. The query invalidation will fetch the correct project object.
          // If `todo.project` was an object: `updatedTodo.project = findProjectById(newProjectId);` (pseudo-code)
          console.log(`  - Dragged item ${updatedTodo.id} updated to P:${updatedTodo.projectId} S:${updatedTodo.state} O:${updatedTodo.order}`);
        } else {
          // 2. Adjust order in the source column (original project, original state)
          //    If item moved out of this column (either state or project changed)
          if (todo.projectId === originalTodo.projectId && todo.state === originalState && todo.order > originalOrder) {
            updatedTodo = { ...todo, order: todo.order - 1 };
            console.log(`  - Source column adjustment (decrement): ${todo.id} O:${todo.order} -> ${updatedTodo.order} (in P:${todo.projectId} S:${todo.state})`);
          }

          // 3. Adjust order in the destination column (new project, new state)
          //    If item moved into this column (either state or project changed)
          //    And this 'todo' is not the item being dragged
          if (todo.projectId === newProjectId && todo.state === newState && todo.order >= newOrder) {
            updatedTodo = { ...todo, order: todo.order + 1 };
            console.log(`  - Dest column adjustment (increment): ${todo.id} O:${todo.order} -> ${updatedTodo.order} (in P:${todo.projectId} S:${todo.state})`);
          }
        }
        return updatedTodo;
      });

      // queryClient.setQueryData<Todo[]>(queryKey, updatedTodos.sort((a,b) => a.order - b.order));
      // Sorting by global order might not be sufficient if projects are changing.
      // The rendering logic groups by project then sorts by order.
      // For optimistic updates, it's better to ensure the list fed to setQueryData
      // is structured or sorted in a way that the view will interpret correctly.
      // A simple sort by projectId, then state, then order might be a good general approach here.
      queryClient.setQueryData<Todo[]>(queryKey, updatedTodos.sort((a, b) => {
        if (a.projectId !== b.projectId) return (a.projectId || "").localeCompare(b.projectId || "");
        if (a.state !== b.state) return a.state.localeCompare(b.state);
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

    let targetState: Todo["state"];
    let targetProjectId: string | null | undefined = currentProjectId === "all" ? undefined : currentProjectId; // Default for single project view or if parsing fails

    const parts = over.toString().split('-');
    if (parts.length > 1 && currentProjectId === "all") { // Composite ID like "projectId-STATE"
      // Expecting the last part to be the state, and the rest to be project ID
      // This handles project IDs that might themselves contain hyphens, though less ideal.
      // A more robust separator or format would be better if project IDs can have hyphens.
      targetState = parts.pop() as Todo["state"];
      targetProjectId = parts.join('-');
      if (!TASK_STATE_OPTIONS.some(opt => opt.value === targetState)) {
        console.warn("Parsed state from composite ID is invalid:", targetState, "Original over.id:", over);
        // Fallback or error handling if state is not valid
        return;
      }
    } else { // Simple ID, just state, or not in "all" projects view
      targetState = over as Todo["state"];
      // If not in "all" projects view, targetProjectId is currentProjectId (which could be a specific project ID)
      // If in "all" projects view but not a composite ID (e.g. dropped on a non-project specific area, if any),
      // then task should remain in its original project.
      targetProjectId = currentProjectId !== "all" ? currentProjectId : originalProjectId;
    }

    console.log(`Drag End: Item ${item} (Proj: ${originalProjectId}) dropped on Col ${over}. Target Proj: ${targetProjectId}, Target State: ${targetState}, Order: ${order}`);

    const payload: TodoEditRequest = {
      id: item as string,
      state: targetState,
      order,
      projectId: targetProjectId === originalProjectId ? undefined : targetProjectId, // Only send projectId if it changed
      // Ensure other fields are not unintentionally blanked if not changing
      // title: undefined,
      // description: undefined,
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
      } else {
        // Handle tasks without a project (optional, depends on requirements)
        if (!projectsMap.has("unassigned")) {
          projectsMap.set("unassigned", {
            id: "unassigned",
            name: "Tarefas Sem Projeto",
            tasks: [],
          });
        }
        projectsMap.get("unassigned")!.tasks.push(todo);
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
            {TASK_STATE_OPTIONS.map(({ value, title }) => {
              const columnTodos = filteredTodos
                .filter((todo) => todo.state === value)
                .sort((a, b) => a.order - b.order);
              return (
                <TodoColumn
                  key={`${currentProjectId}-${value}`} // Ensure unique key for single project columns
                  title={title}
                  todos={columnTodos}
                  state={value}
                  // Pass projectId to TodoColumn if it needs to know its project context,
                  // e.g., for creating new tasks directly in this project.
                  // For now, HomeTaskCreator inside TodoColumn uses redux state which might not be project-specific.
                />
              );
            })}
          </div>
        ) : (
          // All Projects View
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

