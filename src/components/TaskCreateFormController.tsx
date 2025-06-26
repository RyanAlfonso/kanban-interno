"use client";

import { useSearchParams } from "next/navigation"; // Added import
import { TASK_STATE_OPTIONS } from "@/lib/const";
import { TodoCreateRequest, TodoCreateValidator } from "@/lib/validators/todo";
import { TaskCreatorDefaultValues } from "@/redux/actions/todoEditorAction";
import todoCreateRequest from "@/requests/todoCreateRequest";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { FC } from "react";
import { useForm } from "react-hook-form";
// Ensure this import uses @tanstack/react-query
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
  const searchParams = useSearchParams(); // Called useSearchParams
  const queryClient = useQueryClient();
  const { axiosToast } = useToast();

  const form = useForm<TodoCreateRequest>({
    resolver: zodResolver(TodoCreateValidator),
    defaultValues: {
      title: "",
      description: "",
      // state: task.state || TASK_STATE_OPTIONS[0].value, // Removed state
      columnId: task.columnId || undefined, // Set columnId from task prop
      deadline: task.deadline || null,
      label: [],
      // projectId from task prop (derived from column) should take precedence
      projectId: task.projectId || (searchParams.get("projectId") !== "all" ? searchParams.get("projectId") : null) || undefined,
    },
  });

  // Ensure useMutation uses v4+ syntax
  const createMutation = useMutation<Todo, AxiosError, TodoCreateRequest>({
    mutationFn: async (data: TodoCreateRequest) => {
      // data should now include columnId from the form (defaultValues)
      // projectId in data should also be correctly defaulted.
      // The backend /api/todo/create will verify columnId and use its projectId.
      // We can simplify here if the form data is trusted.
      // Let's ensure the projectId passed to todoCreateRequest is explicitly the one from the column if available.
      const payload = {
        ...data,
        // Ensure projectId from the task prop (which is from the column context) is used if available
        projectId: task.projectId || data.projectId,
      };
      return todoCreateRequest(payload);
    },
    onSuccess: (newTodo) => {
      console.log("onSuccess createMutation:", newTodo);
      
      const effectiveProjectId = newTodo.projectId; // Can be null

      // Update cache: Add the new todo to the list associated with its project
      const queryKey = ["todos", { projectId: effectiveProjectId }];

      queryClient.setQueryData<Todo[]>(queryKey, (oldTodos = []) => [ // oldTodos defaults to []
        ...oldTodos,
        newTodo,
      ]);
      
      // Comprehensive query invalidations
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      if (effectiveProjectId) {
        queryClient.invalidateQueries({ queryKey: ["todos", { projectId: effectiveProjectId }] });
      }
      queryClient.invalidateQueries({ queryKey: ["todos", { projectId: null }] });

      handleOnSuccess(); // Close dialog on success
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
        task={task} // Pass default values for creation
        title="Create Task"
        editMutationFunctionReturn={createMutation} // Pass the creation mutation
        formFunctionReturn={form}
      />
    );
  } catch (error) {
    console.error("Error rendering TaskCreateFormController:", error);
    return <div>Ocorreu um erro ao carregar o formulário de criação.</div>;
  }
};

export default TaskCreateFormController;

