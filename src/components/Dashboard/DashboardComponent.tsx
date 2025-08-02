"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getClockColor } from "@/lib/color";
// Importe a função centralizada de queryKey
import { getTodosQueryKey } from "@/lib/queryKeys";
import { PREDEFINED_TAGS, getTagColor, PredefinedTag, TagColor } from "@/lib/tags";
import { cn } from "@/lib/utils";
import todoFetchRequest from "@/requests/todoFetchRequest";
import { Todo } from "@prisma/client";
import dayjs from "dayjs";
import { BarChart, CheckCircle, Circle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query"; 
import { Skeleton } from "../ui/skeleton";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

type LabelType = {
  id: string;
  name: string;
  color: string;
};

type Project = {
  id: string;
  name: string;
};

interface ExtendedTodo extends Todo {
  state: string; 
  labels?: LabelType[];
  project?: Project;
  column?: {
    id: string;
    name: string;
    order: number;
  };
  tags: string[];
}


const DashboardComponent = () => {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") || null;
  const view = searchParams.get("view") || "all";

  // ================== CORREÇÃO APLICADA AQUI ==================
  // Usando a função centralizada `getTodosQueryKey` para garantir consistência
  // com o local onde a query é invalidada (TaskEditFormController).
  const { data: todos = [], isLoading, error } = useQuery<ExtendedTodo[], Error>({
    queryKey: getTodosQueryKey(projectId, view),
    queryFn: async () => {
      const todos = await todoFetchRequest(projectId, view);
      return todos.map((todo: any) => ({
        ...todo,
        state: todo.state ?? "TODO",
        tags: todo.tags ?? [],
      }));
    },
    staleTime: 1000 * 60,
  });
  // ==========================================================

  const sortedTodos = useMemo(
    () =>
      ([...(Array.isArray(todos) ? todos : [])] as ExtendedTodo[]).sort(
        (a, b) => dayjs(b.updatedAt).unix() - dayjs(a.updatedAt).unix()
      ),
    [todos]
  );

  const taskProgressByTag = useMemo(() => {
    const progress: Record<PredefinedTag, { total: number; completed: number; colors: TagColor }> =
      PREDEFINED_TAGS.reduce((acc, tag) => {
        acc[tag] = { total: 0, completed: 0, colors: getTagColor(tag) };
        return acc;
      }, {} as Record<PredefinedTag, { total: number; completed: number; colors: TagColor }>);

    (Array.isArray(todos) ? todos : []).forEach((todo: ExtendedTodo) => {
      if (todo.tags && todo.tags.length > 0) {
        todo.tags.forEach(tagString => {
          const tag = tagString as PredefinedTag;
          if (progress[tag]) {
            progress[tag].total += 1;
            if (todo.state === "DONE") {
              progress[tag].completed += 1;
            }
          }
        });
      }
    });
    return Object.entries(progress)
      .filter(([_, data]) => data.total > 0)
      .reduce((acc, [tag, data]) => {
        acc[tag as PredefinedTag] = data;
        return acc;
      }, {} as Record<PredefinedTag, { total: number; completed: number; colors: TagColor }>);
  }, [todos]);

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
    .filter((todo) => todo.deadline && dayjs(todo.deadline).isAfter(dayjs()))
    .slice().sort((a, b) => dayjs(a.deadline).unix() - dayjs(b.deadline).unix()) : [];
  const nextDueTask = upcomingTasks?.[0];

  const projectProgress =
    (todos as ExtendedTodo[])?.reduce(
      (acc: Record<string, { total: number; completed: number }>, todo: ExtendedTodo) => {
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


  if (isLoading) {
    return <DashboardSkeleton />;
  }
  
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
            </CardContent>
          </Card>
        </div>

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
                        className={cn("h-2", data.colors.bg, data.colors.text === "text-white" ? "progress-indicator-white" : "progress-indicator-dark")}
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
                          "mr-4 flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0",
                          getClockColor(task.deadline ? dayjs(task.deadline).diff(dayjs(), 'day').toString() : 'default').bg,
                        )}
                      >
                        <Clock
                          className={cn("h-5 w-5", getClockColor(task.deadline ? dayjs(task.deadline).diff(dayjs(), 'day').toString() : 'default').badge)}
                        />
                      </div>
                      <div className="space-y-1 overflow-hidden flex-grow min-w-0"> 
                        <p className="text-sm font-medium leading-none truncate" title={task.title}>
                          {task.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {task.deadline ? dayjs(task.deadline).format("MMM D, YYYY h:mm A") : "No deadline"}
                        </p>
                      </div>
                      <div className="ml-auto flex gap-1 flex-wrap justify-end pl-2">
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
