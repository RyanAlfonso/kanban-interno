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

// Passo 1: Corrigir a assinatura da prop
type TaskCreateFormProps = {
  handleOnSuccess: () => void;
  handleOnClose: (isDirty: boolean) => void;
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

  // Passo 2: Extrair o estado 'isDirty' do formulário
  const { formState: { isDirty } } = form;

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
        // Passo 3: Passar uma nova função que chama a original com o estado 'isDirty'
        handleOnClose={() => handleOnClose(isDirty)}
        task={task}
        title="Criar Tarefa"
        editMutationFunctionReturn={createMutation}
        formFunctionReturn={form} onFormDirtyChange={function (isDirty: boolean): void {
          throw new Error("Function not implemented.");
        } }      />
    );
  } catch (error) {
    console.error("Error rendering TaskCreateFormController:", error);
    return <div>Ocorreu um erro ao carregar o formulário de criação.</div>;
  }
};

export default TaskCreateFormController;
