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
import SkeletonColumn from "./SkeletonColumn";
import ViewToggle from "../ViewToggle";
import React, { useState } from "react"; // Import useState
import { Separator } from "../ui/separator";
import { TodoWithColumn } from "@/types/todo";
import { Button } from "../ui/button"; // Import Button
import { exportToExcel } from "@/lib/export"; // Import exportToExcel
import { Download } from "lucide-react";

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

  const { data: todos, isLoading: isLoadingTodos, error: errorTodos } = useQuery<TodoWithColumn[], Error>({
    queryKey: ["todos", { projectId: currentProjectId, viewMode }],
    queryFn: () => todoFetchRequest(currentProjectId === "all" ? null : currentProjectId, viewMode) as Promise<TodoWithColumn[]>, // Assert type
    onError: (err) => {
      axiosToast(new AxiosError("Falha ao buscar tarefas."));
    },
  });

  const isLoading = isLoadingTodos;
  const error = errorTodos;

  const { mutate: handleUpdateState } = useMutation<
    TodoWithColumn, 
    AxiosError,
    TodoEditRequest,
    { previousTodos?: TodoWithColumn[]; queryKey: any[] }
  >({
    mutationFn: async (data: TodoEditRequest) => {
      const updatedTodo = await todoEditRequest(data);
      return updatedTodo as TodoWithColumn; 
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

      const originalTodoState = JSON.parse(JSON.stringify(todoToUpdate)); 

      const newProjectId = payload.projectId || originalTodoState.projectId;
      const newColumnId = payload.columnId!; 
      const newOrder = payload.order!;     

      let tempTodos = JSON.parse(JSON.stringify(previousTodos)) as TodoWithColumn[]; 

      const itemIndex = tempTodos.findIndex(todo => todo.id === payload.id);
      if (itemIndex > -1) {
        tempTodos.splice(itemIndex, 1);
      }

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

      tempTodos = tempTodos.map(todo => {
        if (todo.projectId === newProjectId &&
            todo.columnId === newColumnId &&
            todo.order >= newOrder) {
          return { ...todo, order: todo.order + 1 };
        }
        return todo;
      });

      const updatedTodoItem: TodoWithColumn = {
        ...originalTodoState, 
        projectId: newProjectId, 
        columnId: newColumnId,   
        order: newOrder,         
        ...(payload.title && { title: payload.title }),
        ...(payload.description && { description: payload.description }),
        ...(payload.deadline && { deadline: payload.deadline }),
        ...(payload.label && { label: payload.label }),
        ...(payload.state && { state: payload.state }),
      };

      tempTodos.push(updatedTodoItem);

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
        uniqueProjectIdsInCache.add(originalProjectId ?? null); 
        uniqueProjectIdsInCache.add(newProjectId ?? null);      
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

  const handleExport = () => {
    if (filteredTodos.length > 0) {
      const dataToExport = filteredTodos.map(todo => ({
        ID: todo.id,
        Título: todo.title,
        Descrição: todo.description,
        Prazo: todo.deadline ? new Date(todo.deadline).toLocaleDateString() : 
        'N/A',
        Estado: todo.state,
        Projeto: todo.project?.name || 'N/A',
        CriadoEm: new Date(todo.createdAt).toLocaleDateString(),
        AtualizadoEm: new Date(todo.updatedAt).toLocaleDateString(),
      }));
      exportToExcel(dataToExport, "kanban_tasks", "Tarefas");
    } else {
      axiosToast(new AxiosError("Nenhuma tarefa para exportar."));
    }
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
        pageTitle = "Projeto Desconhecido"; 
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
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar XLS
          </Button>
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


