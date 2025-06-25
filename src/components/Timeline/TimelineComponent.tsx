
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { categorizeDate, getTimeframeSortOrder } from "@/lib/date-util";
import todoFetchRequest from "@/requests/todoFetchRequest";
import { Todo } from "@prisma/client";
import dayjs from "dayjs";
// Update import from react-query to @tanstack/react-query
import { useQuery } from "@tanstack/react-query"; 
import VerticalTimelineSection from "./VerticalTimelineSection";
import { VerticalTimelineSkeleton } from "./VerticalTimelineSkeleton";
import { useToast } from "../ui/use-toast"; // Import useToast
import { useSearchParams } from "next/navigation"; // Import useSearchParams

const TimelineComponent = () => {
  console.log("Rendering TimelineComponent..."); // Added log
  const { toast } = useToast(); // Initialize toast
  const searchParams = useSearchParams(); // Get search params
  const projectId = searchParams.get("projectId") || null; // Get current projectId
  const view = searchParams.get("view") || "all"; // Get current view

  // Update useQuery syntax for v4+
  // Include projectId and view in the queryKey to refetch when they change
  const { data: todos, isLoading, error } = useQuery<Todo[], Error>({
    queryKey: ["todos", { projectId, view }], // Query key includes projectId and view
    queryFn: () => todoFetchRequest(projectId, view), // Pass projectId and view to fetch function
    onError: (err) => {
      console.error("Error fetching todos for timeline:", err);
      // Show toast on error
      toast({
        title: "Erro ao Carregar Tarefas",
        description: err.message || "Não foi possível buscar as tarefas para a linha do tempo.",
        variant: "destructive",
      });
    }
  });

  // Group tasks only if todos exist and are not empty
  const groupedTasks =
    todos && todos.length > 0
      ? todos.reduce((groups: Record<string, Todo[]>, task) => {
          const date = dayjs(task.createdAt);
          const timeframe = categorizeDate(date);

          if (!groups[timeframe]) {
            groups[timeframe] = [];
          }
          // Sort tasks within each group by creation date (newest first)
          groups[timeframe].push(task);
          groups[timeframe].sort((a, b) => dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix());
          return groups;
        }, {}) 
      : {}; // Default to empty object if no todos

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
    // Error toast is shown by useQuery's onError
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
                todos={groupedTasks[timeframe]} // Already sorted within the reduce step
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

