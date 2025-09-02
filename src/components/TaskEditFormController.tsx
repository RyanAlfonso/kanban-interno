// TaskEditFormController.tsx - ALTERAÇÃO REALIZADA

"use client";

import {
  TodoDeleteRequest,
  TodoEditRequest,
  TodoEditValidator,
} from "@/lib/validators/todo";
import todoDeleteRequest from "@/requests/todoDeleteRequest";
import todoEditRequest from "@/requests/todoEditRequest";
import { zodResolver } from "@hookform/resolvers/zod";
import { Todo } from "@prisma/client";
import { QueryKey, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useSearchParams } from "next/navigation";
// 1. Importar useEffect e useState
import { FC, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import "react-quill/dist/quill.snow.css";
import TaskModificationForm from "./TaskModificationForm";
import { useToast } from "./ui/use-toast";

type TaskEditFormProps = {
  handleOnSuccess: () => void;
  handleOnClose: (isDirty: boolean) => void;
  task: Todo;
};

const TaskEditFormController: FC<TaskEditFormProps> = ({
  handleOnSuccess,
  handleOnClose,
  task,
}) => {
  const [isFormDirty, setIsFormDirty] = useState(false);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { axiosToast } = useToast();

  const mainTodosQueryKey: QueryKey = ["todos", searchParams.toString()];
  const sharedTodoQueryKey: QueryKey = ["shared-todo", task.id];

  const form = useForm<TodoEditRequest>({
    resolver: zodResolver(TodoEditValidator),
    // Os defaultValues são removidos daqui para serem controlados pelo useEffect
  });

  // 2. Adicionar o useEffect para resetar o formulário quando a tarefa mudar
  // Esta é a funcionalidade adaptada do código antigo.
  useEffect(() => {
    form.reset({
      id: task.id,
      title: task.title || "",
      description: task.description || null,
      columnId: task.columnId || undefined,
      // @ts-ignore - Adaptado para o seu modelo de dados
      label: task.label || [],
      deadline: task.deadline || null,
      projectId: task.projectId || null,
      order: task.order,
      isDeleted: task.isDeleted || false,
      // Adicione aqui quaisquer outros campos que você tenha no formulário
      // Ex: assignedToIds, parentId, etc.
    });
  }, [task, form.reset]);


  const editMutation = useMutation<
    Todo,
    AxiosError,
    TodoEditRequest,
    { previousTodos: Todo[] | undefined }
  >({
    mutationFn: todoEditRequest,
    onMutate: async (updatedTodo) => {
      await queryClient.cancelQueries({ queryKey: mainTodosQueryKey });
      const previousTodos = queryClient.getQueryData<Todo[]>(mainTodosQueryKey);
      handleOnSuccess();
      return { previousTodos };
    },
    onError: (error, variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(mainTodosQueryKey, context.previousTodos);
      }
      axiosToast(error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: mainTodosQueryKey });
      queryClient.invalidateQueries({ queryKey: sharedTodoQueryKey });
    },
  });

  const deleteMutation = useMutation<
    Todo[],
    AxiosError,
    TodoDeleteRequest,
    { previousTodos: Todo[] | undefined }
  >({
    mutationFn: todoDeleteRequest,
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: mainTodosQueryKey });
      const previousTodos = queryClient.getQueryData<Todo[]>(mainTodosQueryKey);
      queryClient.setQueryData<Todo[]>(mainTodosQueryKey, (old = []) =>
        old.filter((todo) => todo.id !== id)
      );
      handleOnSuccess();
      return { previousTodos };
    },
    onError: (error, variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(mainTodosQueryKey, context.previousTodos);
      }
      axiosToast(error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: mainTodosQueryKey });
      queryClient.invalidateQueries({ queryKey: sharedTodoQueryKey });
    },
  });

  return (
    <TaskModificationForm
      onFormDirtyChange={setIsFormDirty}
      handleOnClose={() => handleOnClose(isFormDirty)}
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
