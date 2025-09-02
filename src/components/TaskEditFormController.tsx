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
import { FC } from "react";
import { useForm } from "react-hook-form";
import "react-quill/dist/quill.snow.css";
import TaskModificationForm, { ExtendedTask } from "./TaskModificationForm";
import { ChecklistItemType } from "./CheckList";
import { useToast } from "./ui/use-toast";

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
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { axiosToast } = useToast();

  const mainTodosQueryKey: QueryKey = ["todos", searchParams.toString()];
  const sharedTodoQueryKey: QueryKey = ["shared-todo", task.id];

  const form = useForm<TodoEditRequest>({
    resolver: zodResolver(TodoEditValidator),
    defaultValues: {
      id: task.id,
      title: task.title || "",
      description: task.description || null,
      columnId: task.columnId || undefined,
      label: task.label || [],
      deadline: task.deadline || null,
      projectId: task.projectId || null,
      order: task.order,
      isDeleted: task.isDeleted || false,
    },
  });

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

  const extendedTask: ExtendedTask = {
    ...task,
    checklist: Array.isArray(task.checklist)
      ? (task.checklist as ChecklistItemType[])
      : [],
  };

  return (
    <TaskModificationForm
      handleOnClose={handleOnClose}
      task={extendedTask}
      title="Edit Task"
      enableDelete
      deleteMutationFunctionReturn={deleteMutation}
      editMutationFunctionReturn={editMutation}
      formFunctionReturn={form}
    />
  );
};

export default TaskEditFormController;
