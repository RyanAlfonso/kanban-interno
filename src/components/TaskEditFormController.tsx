// TaskEditFormController.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { FC, useEffect } from "react"; // Importe o useEffect
import { useForm } from "react-hook-form";
import TaskModificationForm from "./TaskModificationForm";
import { useToast } from "./ui/use-toast";
import { Todo } from "@prisma/client";

type TaskEditFormControllerProps = {
  handleOnSuccess: () => void;
  handleOnClose: () => void;
  task: Todo;
};

const TaskEditFormController: FC<TaskEditFormControllerProps> = ({
  handleOnSuccess,
  handleOnClose,
  task,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const formMethods = useForm({
    // Os valores padrão serão definidos no useEffect para garantir a reinicialização correta
  });

  // Use o useEffect para reiniciar o formulário sempre que a tarefa mudar.
  // Isso garante que o estado 'isDirty' funcione corretamente.
  useEffect(() => {
    formMethods.reset({
      title: task.title || "",
      description: task.description || "",
      referenceDocument: task.referenceDocument || "",
      projectId: task.projectId || "",
      assignedToIds: task.assignedToIds || [],
      parentId: task.parentId || "",
      linkedCardIds: task.linkedCardIds || [],
      deadline: task.deadline ? new Date(task.deadline) : null,
      // @ts-ignore - Prisma pode retornar um tipo complexo, mas precisamos apenas dos IDs
      tags: task.tags?.map((tag: any) => tag.id) || [],
      // @ts-ignore - Mesmo caso para checklist
      checklist: task.checklist || [],
    });
  }, [task, formMethods.reset]);

  const editMutation = useMutation<Todo, AxiosError, any>({
    mutationFn: async (data) => {
      // Linha de depuração para confirmar quando a mutação é realmente chamada
      console.log("-> [MUTATION] Tentando editar tarefa com os dados:", data);

      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BASE_PATH}/api/todo`,
        data
      );
      return response.data;
    },
    // A lógica de sucesso agora está corretamente encapsulada aqui
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Tarefa atualizada." });
      queryClient.invalidateQueries({ queryKey: ["todos"] });

      // Chama a função do componente pai para fechar o modal APÓS o sucesso
      handleOnSuccess();
    },
    onError: (error: AxiosError) => {
      const errorData = error.response?.data as { message?: string };
      toast({
        title: "Erro ao editar",
        description:
          errorData?.message || "Não foi possível atualizar a tarefa.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation<Todo[], AxiosError, { id: string }>({
    mutationFn: async ({ id }) => {
      const { data } = await axios.delete(
        `${process.env.NEXT_PUBLIC_BASE_PATH}/api/todo?id=${id}`
      );
      return data;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Tarefa arquivada." });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      handleOnSuccess();
    },
    onError: (error: AxiosError) => {
      const errorData = error.response?.data as { message?: string };
      toast({
        title: "Erro ao arquivar",
        description:
          errorData?.message || "Não foi possível arquivar a tarefa.",
        variant: "destructive",
      });
    },
  });

  return (
    <TaskModificationForm
      handleOnClose={handleOnClose}
      task={task}
      title="Editar Tarefa"
      enableDelete={true}
      deleteMutationFunctionReturn={deleteMutation}
      editMutation={editMutation}
      formFunctionReturn={formMethods}
    />
  );
};

export default TaskEditFormController;
