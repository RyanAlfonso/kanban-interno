"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import { BarChart, CheckCircle, Circle, Clock } from "lucide-react";

// Componentes de UI
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "../ui/skeleton";

// Funções e tipos
import { getClockColor } from "@/lib/color";
import {
  PREDEFINED_TAGS,
  getTagColor,
  PredefinedTag,
  TagColor,
} from "@/lib/tags";
import { cn } from "@/lib/utils";
import { TodoWithRelations } from "@/types/todo";
import todoFetchRequest from "@/requests/todoFetchRequest";
import { COLUMNS } from "@/lib/permissions"; // Importando os nomes das colunas

const DashboardComponent = () => {
  const searchParams = useSearchParams();

  const {
    data: todos = [],
    isLoading,
    error,
  } = useQuery<TodoWithRelations[], Error>({
    queryKey: ["todos", searchParams.toString()],
    queryFn: () => todoFetchRequest(searchParams),
    staleTime: 1000 * 60,
  });

  const sortedTodos = useMemo(
    () =>
      [...todos].sort(
        (a, b) => dayjs(b.updatedAt).unix() - dayjs(a.updatedAt).unix()
      ),
    [todos]
  );

  const taskProgressByTag = useMemo(() => {
    const progress: Record<
      PredefinedTag,
      { total: number; completed: number; colors: TagColor }
    > = PREDEFINED_TAGS.reduce((acc, tag) => {
      acc[tag] = { total: 0, completed: 0, colors: getTagColor(tag) };
      return acc;
    }, {} as Record<PredefinedTag, { total: number; completed: number; colors: TagColor }>);

    todos.forEach((todo) => {
      if (todo.tags && todo.tags.length > 0) {
        todo.tags.forEach((tagString) => {
          const tag = tagString as PredefinedTag;
          if (progress[tag]) {
            progress[tag].total += 1;
            // CORREÇÃO: Verifica se a tarefa está na coluna "Concluída"
            if (todo.column?.name === COLUMNS.CONCLUIDA) {
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

  if (error) {
    return (
      <div className="p-6 text-red-500">
        Erro ao carregar dados do dashboard: {error.message}
      </div>
    );
  }

  // Cálculos para os cards de resumo
  const lastUpdatedDate =
    todos.length > 0 ? sortedTodos[0]?.updatedAt : dayjs().toDate();
  const totalTasks = todos.length;
  const numOfNewTask = todos.filter((todo) =>
    dayjs(todo.createdAt).isAfter(dayjs().subtract(1, "week"))
  ).length;

  // CORREÇÃO: Usa o nome da coluna para contar tarefas concluídas
  const completedTasks = todos.filter(
    (todo) => todo.column?.name === COLUMNS.CONCLUIDA
  ).length;
  const lastCompletedTask = sortedTodos.find(
    (todo) => todo.column?.name === COLUMNS.CONCLUIDA
  );

  // CORREÇÃO: Usa os nomes das colunas para contar tarefas em progresso
  const inProgressTasks = todos.filter(
    (todo) =>
      todo.column?.name === COLUMNS.EM_EXECUCAO ||
      todo.column?.name === COLUMNS.EM_APROVACAO ||
      todo.column?.name === COLUMNS.MONITORAMENTO
  ).length;
  const lastInProgressTask = sortedTodos.find(
    (todo) =>
      todo.column?.name === COLUMNS.EM_EXECUCAO ||
      todo.column?.name === COLUMNS.EM_APROVACAO ||
      todo.column?.name === COLUMNS.MONITORAMENTO
  );

  const upcomingTasks = todos
    .filter((todo) => todo.deadline && dayjs(todo.deadline).isAfter(dayjs()))
    .sort((a, b) => dayjs(a.deadline!).unix() - dayjs(b.deadline!).unix());
  const nextDueTask = upcomingTasks?.[0];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Última atualização:{" "}
            {lastUpdatedDate
              ? dayjs(lastUpdatedDate).format("D [de] MMM, HH:mm")
              : "N/A"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total de Tarefas</h3>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {numOfNewTask > 0
                ? `+${numOfNewTask} esta semana`
                : "Nenhuma tarefa nova esta semana"}
            </p>
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
              {lastCompletedTask
                ? `Última: ${dayjs(lastCompletedTask.updatedAt).format(
                    "D [de] MMM"
                  )}`
                : "Nenhuma tarefa concluída"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Em Progresso</h3>
            <Circle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressTasks}</div>
            <p
              className="text-xs text-muted-foreground truncate"
              title={lastInProgressTask?.title}
            >
              {lastInProgressTask
                ? `Última movida: ${lastInProgressTask.title}`
                : "Nenhuma tarefa em progresso"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Prazos Próximos</h3>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              {nextDueTask
                ? `Próxima: ${dayjs(nextDueTask.deadline).format("D [de] MMM")}`
                : "Nenhuma tarefa com prazo"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <h3 className="text-base font-medium">Progresso por Tag</h3>
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
                            "h-3 w-3 rounded-full mr-2",
                            data.colors.bg
                          )}
                        ></span>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            data.colors.text
                          )}
                        >
                          {tagName}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {data.completed}/{data.total} tarefas
                      </span>
                    </div>
                    <Progress
                      value={
                        data.total > 0 ? (data.completed / data.total) * 100 : 0
                      }
                      className={cn("h-2", data.colors.bg)}
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma tarefa com tags encontrada.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <h3 className="text-base font-medium">Próximos Prazos</h3>
            <p
              className="text-sm text-muted-foreground truncate"
              title={nextDueTask?.title}
            >
              {nextDueTask
                ? `Próxima tarefa: ${nextDueTask.title}`
                : "Nenhuma tarefa com prazo próximo."}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center mb-4">
                    <div
                      className={cn(
                        "mr-4 flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0",
                        getClockColor(
                          task.deadline
                            ? dayjs(task.deadline)
                                .diff(dayjs(), "day")
                                .toString()
                            : "default"
                        ).bg
                      )}
                    >
                      <Clock
                        className={cn(
                          "h-5 w-5",
                          getClockColor(
                            task.deadline
                              ? dayjs(task.deadline)
                                  .diff(dayjs(), "day")
                                  .toString()
                              : "default"
                          ).badge
                        )}
                      />
                    </div>
                    <div className="space-y-1 overflow-hidden flex-grow min-w-0">
                      <p
                        className="text-sm font-medium leading-none truncate"
                        title={task.title}
                      >
                        {task.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {task.deadline
                          ? dayjs(task.deadline).format("D [de] MMM, YYYY")
                          : "Sem prazo"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma tarefa com prazo encontrada.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const DashboardSkeleton = () => (
  <div className="p-6 space-y-6 animate-pulse">
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
