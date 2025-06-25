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
      const newState = payload.state!;
      const newOrder = payload.order!;

      const newTodos = previousTodos.map((todo) => {
        if (todo.id === payload.id) {
          return { ...todo, state: newState, order: newOrder };
        }
        if (todo.project?.id === originalTodo.project?.id) { // Ensure order changes only within the same project context
          if (todo.state === originalState && todo.order > originalOrder) {
            return { ...todo, order: todo.order - 1 };
          }
          if (todo.state === newState && todo.order >= newOrder) {
            if (todo.id !== payload.id) {
              return { ...todo, order: todo.order + 1 };
            }
          }
        }
        return todo;
      });

      // When "all" projects are shown, sorting needs to be done per project group, then by state for optimistic update
      // For simplicity, the optimistic update will update the flat list,
      // and the rendering logic will group and sort again.
      // More complex optimistic updates would require updating the grouped structure.
      queryClient.setQueryData<Todo[]>(queryKey, newTodos.sort((a,b) => a.order - b.order));

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
      // Invalidate to refetch and ensure consistency, especially with ordering across multiple projects
      queryClient.invalidateQueries({ queryKey: ["todos", { projectId: currentProjectId, viewMode }] });
    },
  });

  const handleDragEnd = (dragEndEvent: OnDragEndEvent) => {
    console.log("handleDragEnd event:", dragEndEvent);
    const { over, item, order } = dragEndEvent;
    if (!over || !item || order === undefined || order === null) {
      console.warn("Invalid drag end event data:", dragEndEvent);
      return;
    }

    // Find the dragged todo to access its projectId for optimistic updates if needed, though not directly changing it here.
    // const draggedTodo = todos?.find(t => t.id === item);

    const payload: TodoEditRequest = {
      state: over as Todo["state"],
      id: item as string,
      order,
      // projectId: draggedTodo?.projectId, // Not changing project here, task stays in its project
      title: undefined,
      description: undefined,
      deadline: undefined,
      label: undefined,
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
                        // Pass projectId here so new tasks created via column's plus button
                        // can be associated with this project.
                        // This requires TodoColumn and HomeTaskCreator to handle a projectId prop.
                        // For now, this change is visual, task creation might need further adjustment.
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

