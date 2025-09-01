"use client";

import { TodoCreateRequest, TodoCreateValidator } from "@/lib/validators/todo";
import { TaskCreatorDefaultValues } from "@/redux/actions/todoEditorAction";
import todoCreateRequest from "@/requests/todoCreateRequest";
import { zodResolver } from "@hookform/resolvers/zod";
import { Todo } from "@prisma/client";
import { useMutation, useQueryClient, QueryKey } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useSearchParams } from "next/navigation";
import { FC } from "react";
import { useForm } from "react-hook-form";
import "react-quill/dist/quill.snow.css";
import TaskModificationForm from "./TaskModificationForm";
import { useToast } from "./ui/use-toast";

type TaskCreateFormProps = {
  handleOnSuccess: () => void;
  handleOnClose: () => void;
  task: TaskCreatorDefaultValues;
};
const TaskCreateFormController: FC<TaskCreateFormProps> = ({
  handleOnSuccess,
  handleOnClose,
  task,
}) => {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { axiosToast } = useToast();

  const mainTodosQueryKey: QueryKey = ["todos", searchParams.toString()];

  const form = useForm<TodoCreateRequest>({
    resolver: zodResolver(TodoCreateValidator),
    defaultValues: {
      title: "",
      description: "",
      columnId: task.columnId || undefined,
      label: [],
      tags: [],
      projectId: task.projectId || (searchParams.get("projectId") !== "all" ? searchParams.get("projectId") : null) || undefined,
      order: undefined,
      assignedToIds: [],
    },
  });
  const createMutation = useMutation<Todo, AxiosError, TodoCreateRequest>({
    mutationFn: async (data: TodoCreateRequest) => {
      const payload = {
        ...data,
        projectId: task.projectId || data.projectId,
      };
      return todoCreateRequest(payload);
    },
    onSuccess: (newTodo) => {
      queryClient.invalidateQueries({ queryKey: mainTodosQueryKey });

      queryClient.invalidateQueries({ queryKey: ["todos"] });

      handleOnSuccess();
    },
    onError: (error) => {
      console.error("onError createMutation:", error);
      axiosToast(error);
    },
  });
  try {
    return (
      <TaskModificationForm
        handleOnClose={handleOnClose}
        task={task}
        title="Criar Tarefa"
        editMutationFunctionReturn={createMutation}
        formFunctionReturn={form}
      />
    );
  } catch (error) {
    console.error("Error rendering TaskCreateFormController:", error);
    return <div>Ocorreu um erro ao carregar o formulário de criação.</div>;
  }
};

export default TaskCreateFormController;
