"use client";

import {
  TodoDeleteRequest,
  TodoEditRequest,
  TodoEditValidator,
} from "@/lib/validators/todo";
import todoEditRequest from "@/requests/todoEditRequest";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { FC } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query"; 
import "react-quill/dist/quill.snow.css";
import TaskModificationForm from "./TaskModificationForm";
import { useToast } from "./ui/use-toast";
import todoDeleteRequest from "@/requests/todoDeleteRequest";
import { useSearchParams } from 'next/navigation';
import { TodoWithRelations } from "@/types/todo";

// ================== BOA PRÁTICA: CENTRALIZAR QUERY KEYS ==================
// Esta função se torna a única fonte da verdade para a chave da query de 'todos'.
// É recomendado mover esta função para um arquivo separado, como `src/lib/queryKeys.ts`,
// para que possa ser importada em todos os componentes que precisam dela.
export const getTodosQueryKey = (projectId: string | null) => ["todos", { projectId }];
// =======================================================================

type TaskEditFormProps = {
  handleOnSuccess: () => void;
  handleOnClose: () => void;
  task: Partial<TodoWithRelations>; 
};

const TaskEditFormController: FC<TaskEditFormProps> = ({
  handleOnSuccess,
  handleOnClose,
  task,
}) => {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") || null;
  const { toast } = useToast(); 

  // Usando a função centralizada para obter a chave da query
  const queryKey = getTodosQueryKey(projectId);

  const form = useForm<TodoEditRequest>({
    resolver: zodResolver(TodoEditValidator),
    defaultValues: {
      id: task.id,
      title: task.title || "",
      description: task.description || null,
      columnId: task.columnId || undefined,
      label: task.label || [],
      tags: (Array.isArray(task.tags) ? task.tags.map((tag: any) => tag.id || tag) : []) || [],
      deadline: task.deadline || null,
      projectId: task.projectId || null,
      order: task.order,
      assignedToIds: task.assignedToIds || [],
      linkedCardIds: task.linkedCardIds || [],
      parentId: task.parentId || null,
      referenceDocument: task.referenceDocument || null,
    },
  });

  const editMutation = useMutation<TodoWithRelations, AxiosError, TodoEditRequest, { prevTodos: TodoWithRelations[] | undefined }>({
    mutationFn: todoEditRequest,
    
    onMutate: async (variables: TodoEditRequest) => {
      await queryClient.cancelQueries({ queryKey });
      const prevTodos = queryClient.getQueryData<TodoWithRelations[]>(queryKey);
      
      // Atualização otimista (opcional, mas melhora a UX)
      queryClient.setQueryData<TodoWithRelations[]>(
        queryKey,
        (oldTodos = []) => 
          oldTodos.map((todo) =>
            todo.id === variables.id ? { ...todo, ...variables, deadline: variables.deadline ? new Date(variables.deadline) : todo.deadline } : todo
          )
      );
      return { prevTodos };
    },
    
    onError: (error, variables, context) => {
      // Reverte a atualização otimista em caso de erro
      if (context?.prevTodos) {
        queryClient.setQueryData(queryKey, context.prevTodos);
      }
      toast({
        title: "Erro na Atualização",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    },
    
    onSuccess: (data) => {
      toast({
        title: "Sucesso!",
        description: "A tarefa foi atualizada.",
      });
      // Fecha o modal para uma melhor experiência do usuário
      handleOnSuccess();
    },

    // `onSettled` é executado após `onSuccess` ou `onError`.
    // É o lugar mais confiável para invalidar queries, pois garante que a
    // busca por novos dados aconteça independentemente do resultado da mutação.
    onSettled: () => {
      console.log(`onSettled: Invalidando a query com a chave: ${JSON.stringify(queryKey)}`);
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
  });

  const deleteMutation = useMutation<any, AxiosError, TodoDeleteRequest>({
    mutationFn: todoDeleteRequest,
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "A tarefa foi excluída." });
      handleOnSuccess();
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir a tarefa.", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
  });

  return (
    <TaskModificationForm
      handleOnClose={handleOnClose}
      task={task}
      title="Edit Task"
      enableDelete
      deleteMutationFunctionReturn={deleteMutation}
      editMutationFunctionReturn={editMutation}
      formFunctionReturn={form}
    />
  );
};

export default TaskEditFormController;
