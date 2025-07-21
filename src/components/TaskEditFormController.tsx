"use client";

import {
  TodoArchiveRequest,
  TodoEditRequest,
  TodoEditValidator,
} from "@/lib/validators/todo";
import { useTypedDispatch } from "@/redux/store";
import todoEditRequest from "@/requests/todoEditRequest";
import { zodResolver } from "@hookform/resolvers/zod";
import { Todo } from "@prisma/client";
import axios, { AxiosError } from "axios";
import { FC } from "react";
import { useForm } from "react-hook-form";
// Update import from react-query to @tanstack/react-query
import { useMutation, useQueryClient } from "@tanstack/react-query"; 
import "react-quill/dist/quill.snow.css";
import TaskModificationForm from "./TaskModificationForm";
import { useToast } from "./ui/use-toast";
import todoArchiveRequest from "@/requests/todoArchiveRequest";
import { useSearchParams } from 'next/navigation'; // Import useSearchParams

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
  console.log("Rendering TaskEditFormController..."); // Added log
  const queryClient = useQueryClient();
  const searchParams = useSearchParams(); // Get search params
  const projectId = searchParams.get("projectId") || null; // Get current projectId

  const { axiosToast } = useToast();
  const form = useForm<TodoEditRequest>({
    resolver: zodResolver(TodoEditValidator),
    defaultValues: {
      id: task.id,
      title: task.title || "",
      description: task.description || null,
      columnId: task.columnId || undefined,
      label: task.label || [], // Assuming 'label' is still part of Todo and TodoEditRequest
      tags: task.tags || [], // Explicitly include tags
      deadline: task.deadline || null,
      projectId: task.projectId || null,
      order: task.order, // Assuming 'order' is part of Todo and TodoEditRequest
      isDeleted: task.isDeleted || false, // Assuming 'isDeleted' is part of Todo and TodoEditRequest
    },
  });

  // Define the query key with projectId context
  const queryKey = ["todos", { projectId }];

  // Update useMutation syntax for v4+
  const editMutation = useMutation<Todo[], AxiosError, TodoEditRequest, { prevTodos: Todo[] | undefined }>({
    mutationFn: todoEditRequest,
    onMutate: async (variables: TodoEditRequest) => {
      console.log("onMutate editMutation:", variables);
      await queryClient.cancelQueries({ queryKey });
      const prevTodos = queryClient.getQueryData<Todo[]>(queryKey);
      console.log("Previous todos (edit):", prevTodos);

      // Optimistically update the cache
      queryClient.setQueryData<Todo[]>(
        queryKey,
        (oldTodos = []) => 
          oldTodos.map((todo) =>
            todo.id === variables.id ? { ...todo, ...variables } : todo
          )
      );

      handleOnSuccess(); // Close dialog immediately on optimistic update
      return { prevTodos };
    },
    onError: (error, variables, context) => {
      console.error("onError editMutation:", error);
      // Rollback on error
      if (context?.prevTodos) {
        queryClient.setQueryData(queryKey, context.prevTodos);
      }
      axiosToast(error);
    },
    onSuccess: (data, variables, context) => {
      console.log("onSuccess editMutation:", data);
      // Invalidate and refetch on success to ensure consistency
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Update useMutation syntax for v4+
  const archiveMutation = useMutation<Todo[], AxiosError, TodoArchiveRequest, { prevTodos: Todo[] | undefined }>({
    mutationFn: todoArchiveRequest,
    onMutate: async (variables: TodoArchiveRequest) => {
      console.log("onMutate archiveMutation:", variables);
      await queryClient.cancelQueries({ queryKey });
      const prevTodos = queryClient.getQueryData<Todo[]>(queryKey);
      console.log("Previous todos (archive):", prevTodos);

      // Optimistically update the cache
      queryClient.setQueryData<Todo[]>(
        queryKey,
        (oldTodos = []) => oldTodos.filter((todo) => todo.id !== variables.id)
      );

      handleOnSuccess(); // Close dialog immediately
      return { prevTodos };
    },
    onError: (error, variables, context) => {
      console.error("onError archiveMutation:", error);
      // Rollback on error
      if (context?.prevTodos) {
        queryClient.setQueryData(queryKey, context.prevTodos);
      }
      axiosToast(error);
    },
    onSuccess: (data, variables, context) => {
      console.log("onSuccess archiveMutation:", data);
      // Invalidate and refetch on success to ensure consistency
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
        deleteMutationFunctionReturn={archiveMutation}
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

