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
      state: task.state || TASK_STATE_OPTIONS[0].value,
      deadline: task.deadline || null,
      label: [],
      // Set projectId from task (passed via Redux), or from URL if specific, else empty for user selection
      projectId: task.projectId || (searchParams.get("projectId") && searchParams.get("projectId") !== "all" ? searchParams.get("projectId")! : ""),
    },
  });

  // Ensure useMutation uses v4+ syntax
  const createMutation = useMutation<Todo, AxiosError, TodoCreateRequest>({
    mutationFn: async (data: TodoCreateRequest) => {
      // projectId now comes directly from the form data (data.projectId)
      // Validation will be handled by Zod resolver based on TodoCreateValidator
      return todoCreateRequest(data);
    },
    onSuccess: (newTodo) => {
      console.log("onSuccess createMutation:", newTodo);
      
      // newTodo.projectId should now always be a valid ID due to upcoming validator changes.
      const effectiveProjectId = newTodo.projectId;

      // Update cache for the specific project
      const projectQueryKey = ["todos", { projectId: effectiveProjectId }];
      queryClient.setQueryData<Todo[]>(projectQueryKey, (oldTodos = []) => [
        ...oldTodos,
        newTodo,
      ]);
      
      // Invalidate general todos list and the "all" projects view as well
      queryClient.invalidateQueries({ queryKey: ["todos"] }); // General key often used for "all" or broader contexts
      queryClient.invalidateQueries({ queryKey: ["todos", { projectId: "all" }] });


      // Also invalidate the specific project query key directly if not already covered by general ["todos"]
      if (effectiveProjectId) {
         queryClient.invalidateQueries({ queryKey: ["todos", { projectId: effectiveProjectId }] });
      }
      // No longer need to invalidate for projectId: null, as it won't be allowed.

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

