// Path: kanban-interno/src/requests/todoEditRequest.ts
import { axiosInstance } from "@/lib/axios";
import { TodoEditRequest } from "@/lib/validators/todo";
import { TodoWithRelations } from "@/types/todo";

/**
 * Envia uma requisição PUT para atualizar uma tarefa.
 * @param payload - O payload com os dados da tarefa a serem atualizados.
 * @returns A tarefa atualizada com todas as suas relações.
 */
const todoEditRequest = async (payload: TodoEditRequest): Promise<TodoWithRelations> => {
  try {
    // ================== CORREÇÃO ESSENCIAL ==================
    // 1. Método alterado de .patch para .put
    // 2. URL alterada de "/todo/edit" para "/todo"
    const response = await axiosInstance.put<TodoWithRelations>("/todo", payload);
    // ========================================================

    return response.data;
  } catch (error) {
    // Relança o erro para que o `onError` da `useMutation` possa capturá-lo.
    throw error;
  }
};

export default todoEditRequest;
