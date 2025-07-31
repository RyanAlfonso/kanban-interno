"use client";

import { Skeleton } from "../ui/skeleton";
import { TASK_STATE_OPTIONS } from "@/lib/const";
import { TodoEditRequest } from "@/lib/validators/todo";
import todoEditRequest from "@/requests/todoEditRequest";
import { Todo, Project } from "@prisma/client";
import { AxiosError } from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient, useQueries } from "@tanstack/react-query";
import DndContextProvider, { OnDragEndEvent } from "../DnDContextProvider";
import { useToast } from "../ui/use-toast";
import TodoColumn from "./TodoColumn";
import todoFetchRequest from "@/requests/todoFetchRequest";
import projectColumnsFetchRequest from "@/requests/projectColumnsFetchRequest";
import { ProjectColumn as PrismaProjectColumn } from "@prisma/client";
import SkeletonColumn from "./SkeletonColumn";
import ViewToggle from "../ViewToggle";
import React, { useState } from 'react';
import { Separator } from "../ui/separator";
import { TodoWithColumn } from "@/types/todo";
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { PlusCircle } from 'lucide-react';
import projectColumnCreateRequest from '@/requests/projectColumnCreateRequest';
import projectColumnDeleteRequest from '@/requests/projectColumnDeleteRequest';
import { useSession } from 'next-auth/react';

interface GroupedProject {
  id: string;
  name: string;
  tasks: TodoWithColumn[];
}

type MutationContext = {
  previousTodos?: TodoWithColumn[];
  queryKey: any[];
};

const TodoColumnManager = () => {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("q")?.toLowerCase() || "";
  const currentProjectId = searchParams.get("projectId") || "all";
  const viewMode = searchParams.get("view") || null;
  const { data: session } = useSession();

  const [showAddColumnForm, setShowAddColumnForm] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  const { data: todos, isLoading: isLoadingTodos, error: errorTodos } = useQuery<TodoWithColumn[], Error>({
    queryKey: ["todos", { projectId: currentProjectId, viewMode }],
    queryFn: () => todoFetchRequest(currentProjectId === "all" ? null : currentProjectId, viewMode) as Promise<TodoWithColumn[]>,
    onError: (err) => {
      toast({ title: "Erro", description: "Falha ao buscar tarefas.", variant: "destructive" });
    },
  });

  const { data: projectColumns, isLoading: isLoadingProjectColumns, error: errorProjectColumns } = useQuery<PrismaProjectColumn[], Error>({
    queryKey: ["projectColumns", { projectId: currentProjectId }],
    queryFn: () => {
      if (currentProjectId === "all") {
        return Promise.resolve(undefined);
      }
      return projectColumnsFetchRequest(currentProjectId);
    },
    enabled: currentProjectId !== "all",
    onError: (err) => {
      toast({ title: "Erro", description: `Falha ao buscar colunas do projeto.`, variant: "destructive" });
    },
  });

  const uniqueProjectIdsFromTodos = (currentProjectId === 'all' && todos)
    ? Array.from(new Set(todos.map(todo => todo.projectId).filter((id): id is string => !!id)))
    : [];

  const queriesConfig = (currentProjectId === 'all' && todos && uniqueProjectIdsFromTodos.length > 0)
    ? uniqueProjectIdsFromTodos.map(projId => ({
        queryKey: ["projectColumns", { projectId: projId }],
        queryFn: () => projectColumnsFetchRequest(projId),
      }))
    : [];

  const allProjectsColumnsQueries = useQueries({
    queries: queriesConfig,
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

  const isLoading = isLoadingTodos || (currentProjectId !== "all" && isLoadingProjectColumns) || isLoadingAllProjectsColumns;
  const error = errorTodos || (currentProjectId !== "all" ? errorProjectColumns : null) || errorAllProjectsColumns;

  const { mutate: createColumnMutation } = useMutation<PrismaProjectColumn, AxiosError, { name: string; order: number; projectId: string }, { previousProjectColumns?: PrismaProjectColumn[] }>({
    mutationFn: async (variables) => {
      const { projectId, name, order } = variables;
      return projectColumnCreateRequest(projectId, { name, order });
    },
    onMutate: async (newColumnData) => {
      await queryClient.cancelQueries({ queryKey: ["projectColumns", { projectId: currentProjectId }] });
      const previousProjectColumns = queryClient.getQueryData<PrismaProjectColumn[]>(["projectColumns", { projectId: currentProjectId }]);
      if (previousProjectColumns) {
        const optimisticColumn: PrismaProjectColumn = { id: `optimistic-${Date.now()}`, name: newColumnData.name, order: newColumnData.order, projectId: newColumnData.projectId, createdAt: new Date(), updatedAt: new Date() };
        queryClient.setQueryData<PrismaProjectColumn[]>(["projectColumns", { projectId: currentProjectId }], [...previousProjectColumns, optimisticColumn].sort((a,b) => a.order - b.order));
      }
      return { previousProjectColumns };
    },
    onError: (err, newColumn, context) => {
      if (context?.previousProjectColumns) {
        queryClient.setQueryData(["projectColumns", { projectId: currentProjectId }], context.previousProjectColumns);
      }
      toast({ title: "Erro", description: `Falha ao criar coluna: ${err.response?.data || err.message}`, variant: "destructive" });
    },
    onSuccess: () => {
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

  const { mutate: deleteColumnMutation } = useMutation<PrismaProjectColumn, AxiosError, string, { previousProjectColumns?: PrismaProjectColumn[] }>({
    mutationFn: (columnId: string) => projectColumnDeleteRequest(columnId),
    onMutate: async (columnIdToDelete) => {
      await queryClient.cancelQueries({ queryKey: ["projectColumns", { projectId: currentProjectId }] });
      const previousProjectColumns = queryClient.getQueryData<PrismaProjectColumn[]>(["projectColumns", { projectId: currentProjectId }]);
      if (previousProjectColumns) {
        queryClient.setQueryData<PrismaProjectColumn[]>(["projectColumns", { projectId: currentProjectId }], previousProjectColumns.filter(column => column.id !== columnIdToDelete));
      }
      return { previousProjectColumns };
    },
    onError: (err, columnId, context) => {
      if (context?.previousProjectColumns) {
        queryClient.setQueryData(["projectColumns", { projectId: currentProjectId }], context.previousProjectColumns);
      }
      toast({ title: "Erro", description: `Falha ao excluir coluna: ${err.response?.data || err.message}`, variant: "destructive" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projectColumns", { projectId: currentProjectId }] });
      queryClient.invalidateQueries({ queryKey: ["todos", { projectId: currentProjectId, viewMode }] });
      if (currentProjectId === 'all') {
          queryClient.invalidateQueries({ queryKey: ["todos", { projectId: "all", viewMode }] });
      }
    },
  });

  const handleDeleteColumn = (columnId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta coluna? As tarefas nesta coluna ficarão desassociadas.")) {
      if (currentProjectId === "all") {
        let ownerProjectId: string | undefined;
        for (const projId in allProjectsColumnsMap) {
            if (allProjectsColumnsMap[projId].some(col => col.id === columnId)) {
                ownerProjectId = projId;
                break;
            }
        }
        if (ownerProjectId) {
            deleteColumnMutation(columnId);
        } else {
            toast({ title: "Erro", description: "Não foi possível identificar o projeto da coluna para exclusão.", variant: "destructive" });
        }
      } else {
        deleteColumnMutation(columnId);
      }
    }
  };

  const { mutate: handleUpdateState } = useMutation<TodoWithColumn, AxiosError, TodoEditRequest, MutationContext>({
    // ================== CORREÇÃO APLICADA AQUI ==================
    mutationFn: async (data: TodoEditRequest) => {
      // A função todoEditRequest retorna um array, então pegamos o primeiro elemento.
      const updatedTodos = await todoEditRequest(data);
      
      // Adicionamos uma verificação para garantir que o array não está vazio.
      if (!updatedTodos || updatedTodos.length === 0) {
        throw new Error("A API não retornou a tarefa atualizada.");
      }
      
      // Retornamos apenas o primeiro objeto do array.
      return updatedTodos[0] as TodoWithColumn;
    },
    // =============================================================
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
          if (todo.projectId === originalTodoState.projectId && todo.columnId === originalTodoState.columnId && todo.order > originalTodoState.order) {
            return { ...todo, order: todo.order - 1 };
          }
          return todo;
        });
      }
      tempTodos = tempTodos.map(todo => {
        if (todo.projectId === newProjectId && todo.columnId === newColumnId && todo.order >= newOrder) {
          return { ...todo, order: todo.order + 1 };
        }
        return todo;
      });
      const updatedTodoItem: TodoWithColumn = { ...originalTodoState, projectId: newProjectId, columnId: newColumnId, order: newOrder, ...(payload.title && { title: payload.title }), ...(payload.description && { description: payload.description }), ...(payload.deadline && { deadline: payload.deadline }), ...(payload.label && { label: payload.label }) };
      tempTodos.push(updatedTodoItem);
      tempTodos.sort((a, b) => {
        if (a.projectId && b.projectId && a.projectId !== b.projectId) return a.projectId.localeCompare(b.projectId);
        if (a.columnId && b.columnId && a.columnId !== b.columnId) return a.columnId.localeCompare(b.columnId);
        return a.order - b.order;
      });
      queryClient.setQueryData<TodoWithColumn[]>(queryKey, tempTodos);
      return { previousTodos, queryKey };
    },
    onError: (error, variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(context.queryKey, context.previousTodos);
      }
      const errorMessage = error.response?.data as string;
      toast({
        title: "Movimento Não Permitido",
        description: errorMessage || "Você não tem permissão para realizar esta ação.",
        variant: "destructive",
      });
    },
    onSuccess: (updatedTodoFromServer, variables, context) => {
      if (!context || !Array.isArray(context.previousTodos)) {
        queryClient.invalidateQueries({ queryKey: ["todos", { projectId: currentProjectId, viewMode }] });
        return;
      }
      queryClient.invalidateQueries({ queryKey: context.queryKey });
      const originalProjectId = context.previousTodos.find(t => t.id === variables.id)?.projectId;
      const newProjectId = updatedTodoFromServer.projectId;
      if (currentProjectId === "all") {
        if (originalProjectId && newProjectId && originalProjectId !== newProjectId) {
          queryClient.invalidateQueries({ queryKey: ["todos", { projectId: originalProjectId, viewMode }] });
          queryClient.invalidateQueries({ queryKey: ["todos", { projectId: newProjectId, viewMode }] });
        }
        const uniqueProjectIdsInCache = new Set(context.previousTodos.map(t => t.projectId).filter(Boolean));
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
      let foundProjectForColumn = false;
      for (const projId in allProjectsColumnsMap) {
        if (allProjectsColumnsMap[projId].some(col => col.id === targetColumnId)) {
          targetProjectId = projId;
          foundProjectForColumn = true;
          break;
        }
      }
      if (!foundProjectForColumn) {
        targetProjectId = originalProjectId;
      }
    }
    const payload: TodoEditRequest = {
      id: item as string,
      columnId: targetColumnId,
      order,
      projectId: (targetProjectId && targetProjectId !== "all" && targetProjectId !== originalProjectId) ? targetProjectId : undefined,
    };
    handleUpdateState(payload);
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

  const filteredTodos = (Array.isArray(todos) ? todos : []).filter((todo) => {
      if (!searchTerm) return true;
      const inTitle = todo.title?.toLowerCase().includes(searchTerm);
      const inDescription = todo.description?.toLowerCase().includes(searchTerm) ?? false;
      return inTitle || inDescription;
    });

  let pageTitle = "Todas as áreas";
  if (currentProjectId && currentProjectId !== "all") {
    const projectTodo = filteredTodos.find(todo => todo.project?.id === currentProjectId);
    if (projectTodo?.project?.name) {
      pageTitle = projectTodo.project.name;
    } else {
      const projects = queryClient.getQueryData<Project[]>(["projects"]);
      const project = projects?.find(p => p.id === currentProjectId);
      if (project?.name) {
        pageTitle = project.name;
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
          projectsMap.set(todo.project.id, { id: todo.project.id, name: todo.project.name || "Projeto Sem Nome", tasks: [] });
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
              const columnTodos = filteredTodos.filter((todo) => todo.columnId === column.id).sort((a, b) => a.order - b.order);
              return (<TodoColumn key={column.id} title={column.name} todos={columnTodos} columnId={column.id} projectId={currentProjectId} onDeleteColumn={handleDeleteColumn} />);
            })}
            {session?.user?.role === 'ADMIN' && currentProjectId !== "all" && !isLoadingProjectColumns && (
              <div className="min-w-[280px] w-[280px] flex-shrink-0 p-1">
                {showAddColumnForm ? (
                  <form onSubmit={(e) => { e.preventDefault(); handleCreateColumn(newColumnName); }} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-md space-y-2">
                    <Input type="text" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} placeholder="Nome da Coluna" className="bg-white dark:bg-slate-800" autoFocus />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddColumnForm(false)}>Cancelar</Button>
                      <Button type="submit" size="sm" disabled={!newColumnName.trim()}>Adicionar</Button>
                    </div>
                  </form>
                ) : (
                  <Button variant="outline" className="w-full border-dashed hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => setShowAddColumnForm(true)}><PlusCircle className="h-4 w-4 mr-2" />Adicionar Nova Coluna</Button>
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
                        const projectColumnTodos = project.tasks.filter((todo) => todo.columnId === column.id).sort((a, b) => a.order - b.order);
                        return (<TodoColumn key={column.id} title={column.name} todos={projectColumnTodos} columnId={column.id} projectId={project.id} onDeleteColumn={handleDeleteColumn} />);
                      })
                    ) : (
                      (() => {
                        const queryIndex = queriesConfig.findIndex(c => {
                          const keyPart = c.queryKey[1];
                          return typeof keyPart === 'object' && keyPart !== null && 'projectId' in keyPart && keyPart.projectId === project.id;
                        });
                        if (queryIndex > -1 && allProjectsColumnsQueries[queryIndex]?.isLoading) {
                          return <p className="px-2 text-muted-foreground">Carregando colunas...</p>;
                        }
                        return <p className="px-2 text-muted-foreground">Nenhuma coluna definida para este projeto.</p>;
                      })()
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
