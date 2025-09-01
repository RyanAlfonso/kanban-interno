
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { categorizeDate, getTimeframeSortOrder } from "@/lib/date-util";
import todoFetchRequest from "@/requests/todoFetchRequest";
import { TodoWithColumn } from "@/types/todo";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import VerticalTimelineSection from "./VerticalTimelineSection";
import { VerticalTimelineSkeleton } from "./VerticalTimelineSkeleton";
import { useToast } from "../ui/use-toast"; 
import { useSearchParams } from "next/navigation";

const TimelineComponent = () => {
  console.log("Rendering TimelineComponent...");
  const { toast } = useToast();
  const searchParams = useSearchParams(); 
  const projectId = searchParams.get("projectId") || null; 
  const view = searchParams.get("view") || "all";

  const { data: todos, isLoading, error } = useQuery<TodoWithColumn[], Error>({
    queryKey: ["todos", { projectId, view }],
    queryFn: () => todoFetchRequest(projectId, view, searchParams) as Promise<TodoWithColumn[]>,
   // onError: (err) => {
   //   console.error("Error fetching todos for timeline:", err);
   //   toast({
  //      title: "Erro ao Carregar Tarefas",
   //     description: err.message || "Não foi possível buscar as tarefas para a linha do tempo.",
   //     variant: "destructive",
      });
  //  }
 // });

  const groupedTasks =
    todos && todos.length > 0
      ? todos.reduce((groups: Record<string, TodoWithColumn[]>, task) => {
          const date = dayjs(task.createdAt);
          const timeframe = categorizeDate(date);

          if (!groups[timeframe]) {
            groups[timeframe] = [];
          }
          groups[timeframe].push(task);
          groups[timeframe].sort((a, b) => dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix());
          return groups;
        }, {} as Record<string, TodoWithColumn[]>)
      : {};

  if (isLoading) {
    console.log("TimelineComponent loading...");
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <VerticalTimelineSkeleton />
      </div>
    );
  }

  if (error) {
    console.error("TimelineComponent render error:", error);
    return <div className="container mx-auto py-8 px-4 md:px-6 text-red-500">Erro ao carregar a linha do tempo. Tente recarregar a página.</div>;
  }

  const sortedTimeframes = Object.keys(groupedTasks).sort(
    (a, b) => getTimeframeSortOrder(a) - getTimeframeSortOrder(b),
  );
  
  console.log("TimelineComponent rendering content...");
  try {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 fade-in">
        {sortedTimeframes.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground">Nenhuma tarefa encontrada para exibir na linha do tempo.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8 text-card-foreground">
            {sortedTimeframes.map((timeframe) => (
              <VerticalTimelineSection
                key={timeframe}
                title={timeframe}
                todos={groupedTasks[timeframe]}
              />
            ))}
          </div>
        )}
      </div>
    );
  } catch (renderError) {
      console.error("Error rendering TimelineComponent content:", renderError);
      return <div className="container mx-auto py-8 px-4 md:px-6 text-red-500">Ocorreu um erro ao renderizar a linha do tempo.</div>;
  }
};

export default TimelineComponent;

