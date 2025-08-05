"use client";

import {
  TodoDeleteRequest,
  TodoEditRequest,
  TodoEditValidator,
} from "@/lib/validators/todo";
import todoEditRequest from "@/requests/todoEditRequest";
import { zodResolver } from "@hookform/resolvers/zod";
import { Todo } from "@prisma/client";
import axios, { AxiosError } from "axios";
import { FC } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query"; 
import "react-quill/dist/quill.snow.css";
import TaskModificationForm from "./TaskModificationForm";
import { useToast } from "./ui/use-toast";
import todoDeleteRequest from "@/requests/todoDeleteRequest";
import { useSearchParams } from 'next/navigation';

type TaskEditFormProps = {
  handleOnSuccess: () => void;
  handleOnClose: () => void;
  task: Todo;
};

const TaskEditFormController: FC<TaskEditFormProps> = ({
  handleOnSuccess,
  handleOnClose,
  task,
}) => {
  console.log("Rendering TaskEditFormController...");
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") || null;

  const { axiosToast } = useToast();
  const form = useForm<TodoEditRequest>({
    resolver: zodResolver(TodoEditValidator),
    defaultValues: {
      id: task.id,
      title: task.title || "",
      description: task.description || null,
      columnId: task.columnId || undefined,
      label: task.label || [], 
      tags: task.tags || [],
      deadline: task.deadline || null,
      projectId: task.projectId || null,
      order: task.order,
      isDeleted: task.isDeleted || false, 
    },
  });

  const queryKey = ["todos", { projectId }];

  const editMutation = useMutation<Todo[], AxiosError, TodoEditRequest, { prevTodos: Todo[] | undefined }>({
    mutationFn: todoEditRequest,
    onMutate: async (variables: TodoEditRequest) => {
      console.log("onMutate editMutation:", variables);
      await queryClient.cancelQueries({ queryKey });
      const prevTodos = queryClient.getQueryData<Todo[]>(queryKey);
      console.log("Previous todos (edit):", prevTodos);

      queryClient.setQueryData<Todo[]>(
        queryKey,
        (oldTodos = []) => 
          oldTodos.map((todo) =>
            todo.id === variables.id ? { ...todo, ...variables } : todo
          )
      );

      handleOnSuccess();
      return { prevTodos };
    },
    onError: (error, variables, context) => {
      console.error("onError editMutation:", error);
      if (context?.prevTodos) {
        queryClient.setQueryData(queryKey, context.prevTodos);
      }
      axiosToast(error);
    },
    onSuccess: (data, variables, context) => {
      console.log("onSuccess editMutation:", data);
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation<Todo[], AxiosError, TodoDeleteRequest, { prevTodos: Todo[] | undefined }>({
    mutationFn: todoDeleteRequest,
    onMutate: async (variables: TodoDeleteRequest) => {
      console.log("onMutate deleteMutation:", variables);
      await queryClient.cancelQueries({ queryKey });
      const prevTodos = queryClient.getQueryData<Todo[]>(queryKey);
      console.log("Previous todos (delete):", prevTodos);

      queryClient.setQueryData<Todo[]>(
        queryKey,
        (oldTodos = []) => oldTodos.filter((todo) => todo.id !== variables.id)
      );

      handleOnSuccess();
      return { prevTodos };
    },
    onError: (error, variables, context) => {
      console.error("onError deleteMutation:", error);
      if (context?.prevTodos) {
        queryClient.setQueryData(queryKey, context.prevTodos);
      }
      axiosToast(error);
    },
    onSuccess: (data, variables, context) => {
      console.log("onSuccess deleteMutation:", data);
      queryClient.invalidateQueries({ queryKey });
    },
  });

  try {
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
  } catch (error) {
    console.error("Error rendering TaskEditFormController:", error);
    return <div>Ocorreu um erro ao editar a tarefa.</div>;
  }
};

export default TaskEditFormController;

