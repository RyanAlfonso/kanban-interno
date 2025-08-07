"use client";

import { useSearchParams } from "next/navigation";
import { TodoCreateRequest, TodoCreateValidator } from "@/lib/validators/todo";
import { TaskCreatorDefaultValues } from "@/redux/actions/todoEditorAction";
import todoCreateRequest from "@/requests/todoCreateRequest";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { FC } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query"; 
import "react-quill/dist/quill.snow.css";
import TaskModificationForm from "./TaskModificationForm";
import { useToast } from "./ui/use-toast";
import { Todo } from "@prisma/client";

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
  console.log("Rendering TaskCreateFormController (Corrected)...");
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { axiosToast } = useToast();

  const form = useForm<TodoCreateRequest>({
    resolver: zodResolver(TodoCreateValidator),
    defaultValues: {
      title: "",
      description: "",
      columnId: task.columnId || undefined,
     // deadline: "",
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
      console.log("onSuccess createMutation:", newTodo);
      
      const effectiveProjectId = newTodo.projectId;

      const queryKey = ["todos", { projectId: effectiveProjectId }];

      queryClient.setQueryData<Todo[]>(queryKey, (oldTodos = []) => [
        ...oldTodos,
        newTodo,
      ]);
      
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      if (effectiveProjectId) {
        queryClient.invalidateQueries({ queryKey: ["todos", { projectId: effectiveProjectId }] });
      }
      queryClient.invalidateQueries({ queryKey: ["todos", { projectId: null }] });

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