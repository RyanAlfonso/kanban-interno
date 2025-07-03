"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getClockColor } from "@/lib/color"; // Removed getLabelColor
import { PREDEFINED_TAGS, getTagColor, PredefinedTag, TagColor } from "@/lib/tags"; // Added tag imports
import { cn } from "@/lib/utils";
import todoFetchRequest from "@/requests/todoFetchRequest";
import { Todo } from "@prisma/client";
import dayjs from "dayjs";
import { BarChart, CheckCircle, Circle, Clock } from "lucide-react";
// Update import from react-query to @tanstack/react-query
import { useQuery } from "@tanstack/react-query"; 
import { Skeleton } from "../ui/skeleton";
import { useSearchParams } from "next/navigation"; // Import useSearchParams
import { useMemo } from "react";

// Define Label type if not already defined globally or imported
type LabelType = {
  id: string;
  name: string;
  color: string;
};

// Define Project type if not already defined globally or imported
// Assuming a simple structure, adjust if needed based on actual Prisma schema
type Project = {
  id: string;
  name: string;
  // Add other project fields if necessary
};

// Update Todo type to include project relation if necessary
// Assuming labels are now associated with projects or tasks directly
// Adjust the Todo type based on your actual Prisma schema
interface ExtendedTodo extends Todo {
  labels?: LabelType[]; // Assuming labels are directly on Todo or fetched separately
  project?: Project; // Assuming a relation exists
  column?: { // Added column to ExtendedTodo
    id: string;
    name: string;
    order: number;
  };
  tags?: string[]; // Added tags to ExtendedTodo for dashboard
}


const DashboardComponent = () => {
  console.log("Rendering DashboardComponent..."); // Added log
  const searchParams = useSearchParams(); // Get search params
  const projectId = searchParams.get("projectId") || null; // Get current projectId
  const view = searchParams.get("view") || "all"; // Get current view

  // Update useQuery syntax for v4+
  // Include projectId and view in the queryKey to refetch when they change
  const { data: todos = [], isLoading, error } = useQuery<ExtendedTodo[], Error>({
    queryKey: ["todos", { projectId, view }], // Query key includes projectId and view
    queryFn: () => todoFetchRequest(projectId, view), // Pass projectId and view to fetch function
    onError: (err) => {
      console.error("Error fetching todos for dashboard:", err);
    },
    // Add stale time and caching strategy
    staleTime: 1000 * 60, // 1 minute
    cacheTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mova o useMemo para antes dos returns condicionais
  const sortedTodos = useMemo(
    () =>
      ([...(Array.isArray(todos) ? todos : [])] as ExtendedTodo[]).sort(
        (a, b) => dayjs(b.updatedAt).unix() - dayjs(a.updatedAt).unix()
      ),
    [todos]
  );

  // Calculate task progress by tag
  // Moved this useMemo hook before conditional returns
  const taskProgressByTag = useMemo(() => {
    const progress: Record<PredefinedTag, { total: number; completed: number; colors: TagColor }> =
      PREDEFINED_TAGS.reduce((acc, tag) => {
        acc[tag] = { total: 0, completed: 0, colors: getTagColor(tag) };
        return acc;
      }, {} as Record<PredefinedTag, { total: number; completed: number; colors: TagColor }>);

    (Array.isArray(todos) ? todos : []).forEach((todo: ExtendedTodo) => {
      if (todo.tags && todo.tags.length > 0) {
        todo.tags.forEach(tagString => {
          const tag = tagString as PredefinedTag; // Assuming tags in DB are valid PredefinedTag
          if (progress[tag]) {
            progress[tag].total += 1;
            if (todo.state === "DONE") {
              progress[tag].completed += 1;
            }
          }
        });
      }
    });
    // Filter out tags that have no tasks for cleaner display
    return Object.entries(progress)
      .filter(([_, data]) => data.total > 0)
      .reduce((acc, [tag, data]) => {
        acc[tag as PredefinedTag] = data;
        return acc;
      }, {} as Record<PredefinedTag, { total: number; completed: number; colors: TagColor }>);
  }, [todos]);

  // Early return for loading and error states
  if (isLoading) return <DashboardSkeleton />;
  if (error || !Array.isArray(todos)) {
    console.error("DashboardComponent render error:", error);
    return (
      <div className="p-6 text-red-500">
        Erro ao carregar dados do dashboard: {error?.message || 'Dados inválidos'}
      </div>
    );
  }

  const lastUpdatedDate = todos.length > 0 ? sortedTodos[0]?.updatedAt : dayjs().toDate();
  const totalTasks = todos.length;
  const numOfNewTask = todos.filter((todo: ExtendedTodo) =>
    dayjs(todo.createdAt).isAfter(dayjs().subtract(1, "week"))
  ).length;

  const completedTasks = (Array.isArray(todos) ? todos : []).filter((todo: ExtendedTodo) => todo.state === "DONE").length;
  const lastCompletedTask = Array.isArray(todos)
    ? (todos as ExtendedTodo[]).slice().sort((a: ExtendedTodo, b: ExtendedTodo) => dayjs(b.updatedAt).unix() - dayjs(a.updatedAt).unix())
      .find((todo: ExtendedTodo) => todo.state === "DONE")
    : undefined;

  const inProgressTasks = todos?.filter(
    (todo: ExtendedTodo) => todo.state === "IN_PROGRESS" || todo.state === "REVIEW",
  ).length ?? 0;
  const lastInProgressTask = todos
    ?.slice()
    .sort((a: ExtendedTodo, b: ExtendedTodo) => dayjs(b.updatedAt).unix() - dayjs(a.updatedAt).unix())
    .find((todo: ExtendedTodo): todo is ExtendedTodo => 
      todo.state === "IN_PROGRESS" || todo.state === "REVIEW"
    ) as ExtendedTodo | undefined;

  const upcomingTasks = Array.isArray(todos) ? (todos as ExtendedTodo[])
    .filter((todo) => todo.deadline && dayjs(todo.deadline).isAfter(dayjs())) // Check if deadline exists
    .slice().sort((a, b) => dayjs(a.deadline).unix() - dayjs(b.deadline).unix()) : [];
  const nextDueTask = upcomingTasks?.[0];

  // Adjust project progress calculation based on how labels/projects are structured
  // This assumes labels are directly on the Todo object as an array of strings
  const projectProgress =
    (todos as ExtendedTodo[])?.reduce(
      (acc: Record<string, { total: number; completed: number }>, todo: ExtendedTodo) => {
        // Use todo.column.name for grouping progress by area/column
        const columnName = todo.column?.name;
        if (columnName) {
          if (acc[columnName]) {
            acc[columnName].total += 1;
            if (todo.state === "DONE") {
              acc[columnName].completed += 1;
            }
          } else {
            acc[columnName] = { total: 1, completed: todo.state === "DONE" ? 1 : 0 };
          }
        }
        return acc;
      },
      {} as Record<string, { total: number; completed: number }>,
    ) || {};

  // taskProgressByTag is already moved up

  if (isLoading) {
    console.log("DashboardComponent loading...");
    return (
      <div className="p-6 space-y-6">
        <div className="text-sm text-muted-foreground mb-8">
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="h-96 lg:col-span-4 rounded-lg" />
          <Skeleton className="h-96 lg:col-span-3 rounded-lg" />
        </div>
      </div>
    );
  }
  
  console.log("DashboardComponent rendering content...");
  try {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              Last updated: {lastUpdatedDate ? dayjs(lastUpdatedDate).format("MMM D, h:mm A") : "N/A"}
            </Badge>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Tarefas</h3>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTasks}</div>
              {numOfNewTask === 0 ? (
                <p className="text-xs text-muted-foreground">No new tasks this week</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  +{numOfNewTask} from this week
                </p>
              )}
              {/* Progress bar might need meaningful value */}
              {/* <Progress value={totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0} className="mt-3 h-1" /> */} 
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Concluídas</h3>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTasks}</div>
              <p className="text-xs text-muted-foreground">
                {lastCompletedTask ? (
                  <>
                    Last completed:{" "}
                    {dayjs(lastCompletedTask.updatedAt).format("MMM D, h:mm A")}
                  </>
                ) : (
                  "Sem tarefas concluídas"
                )}
              </p>
              {/* <Progress value={totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0} className="mt-3 h-1" /> */} 
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Em progresso</h3>
              <Circle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressTasks}</div>
              {lastInProgressTask ? (
                <p className="text-xs text-muted-foreground truncate" title={lastInProgressTask.title}>
                  Last updated: {lastInProgressTask.title}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sem tarefas em progresso
                </p>
              )}
              {/* <Progress value={totalTasks > 0 ? (inProgressTasks / totalTasks) * 100 : 0} className="mt-3 h-1" /> */} 
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Prazos próximos</h3>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingTasks?.length ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                {nextDueTask ? (
                  <>
                    Próximo prazo:{" "}
                    {dayjs(nextDueTask.deadline).format("MMM D, h:mm A")}
                  </>
                ) : (
                  "No upcoming tasks"
                )}
              </p>
              {/* <Progress value={upcomingTasks?.length ?? 0 > 0 ? 50 : 0} className="mt-3 h-1" /> */}
            </CardContent>
          </Card>
        </div>

        {/* Task Completion by Tag and Upcoming Deadlines */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <h3 className="text-base font-medium">Progresso de tarefas por tag</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.keys(taskProgressByTag).length > 0 ? (
                  Object.entries(taskProgressByTag).map(([tagName, data]) => (
                    <div key={tagName} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span
                            className={cn(
                              `h-3 w-3 rounded-full mr-2`,
                              data.colors.bg
                            )}
                          ></span>
                          <span className={cn("text-sm font-medium", data.colors.text && data.colors.bg.includes("dark:") ? data.colors.text.replace("text-","dark:text-") : data.colors.text )}>{tagName}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {data.completed}/{data.total} tasks
                        </span>
                      </div>
                      <Progress
                        value={ (data.total > 0 ? (data.completed / data.total) * 100 : 0)}
                        className={cn("h-2", data.colors.bg)} // Use tag color for progress bar background
                        indicatorClassName={cn(data.colors.text === "text-white" ? "bg-white" : "bg-slate-700")} // Adjust indicator for contrast
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No tasks found with tags.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <h3 className="text-base font-medium">Próximos prazos</h3>
              {nextDueTask ? (
                <p className="text-sm text-muted-foreground truncate" title={nextDueTask.title}>
                  Próximo prazo: {nextDueTask.title}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sem tarefas com prazos próximos.
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingTasks && upcomingTasks.length > 0 ? (
                  upcomingTasks.map((task: ExtendedTodo) => (
                    <div key={task.id} className="flex items-center mb-4">
                      <div
                        className={cn(
                          "mr-4 flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0", // Added flex-shrink-0
                          getClockColor(task.deadline ? dayjs(task.deadline).diff(dayjs(), 'day').toString() : 'default').bg, // Use days diff for color
                        )}
                      >
                        <Clock
                          className={cn("h-5 w-5", getClockColor(task.deadline ? dayjs(task.deadline).diff(dayjs(), 'day').toString() : 'default').badge)}
                        />
                      </div>
                      <div className="space-y-1 overflow-hidden flex-grow min-w-0"> {/* Added flex-grow and min-w-0 */} 
                        <p className="text-sm font-medium leading-none truncate" title={task.title}>
                          {task.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {task.deadline ? dayjs(task.deadline).format("MMM D, YYYY h:mm A") : "No deadline"}
                        </p>
                      </div>
                      <div className="ml-auto flex gap-1 flex-wrap justify-end pl-2"> {/* Added flex-wrap and justify-end */} 
                        {(task.label || []).map((label) => (
                          <Badge variant="outline" key={label} className="text-xs whitespace-nowrap">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming tasks found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch (renderError) {
      console.error("Error rendering DashboardComponent content:", renderError);
      return <div className="p-6 text-red-500">Ocorreu um erro ao renderizar o dashboard.</div>;
  }
};

/**
 * Skeleton loader for the dashboard.
 */
const DashboardSkeleton = () => (
  <div className="p-6 space-y-6">
    <div className="text-sm text-muted-foreground mb-8">
      <Skeleton className="h-4 w-64" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-lg" />
      ))}
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Skeleton className="h-96 lg:col-span-4 rounded-lg" />
      <Skeleton className="h-96 lg:col-span-3 rounded-lg" />
    </div>
  </div>
);

export default DashboardComponent;

