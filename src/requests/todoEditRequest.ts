// Caminho: src/requests/todoEditRequest.ts

import { axiosInstance } from "@/lib/axios";
import { TodoEditRequest } from "@/lib/validators/todo";
// 1. Importar o tipo correto que inclui as relações (anexos, comentários, etc.)
import { TodoWithRelations } from "@/types/todo"; 

/**
 * Envia uma requisição PATCH para atualizar uma tarefa.
 * @param payload - O payload com os dados da tarefa a serem atualizados.
 * @returns A tarefa atualizada com todas as suas relações.
 */
const todoEditRequest = async (payload: TodoEditRequest): Promise<TodoWithRelations> => {
  try {
    // 2. Acessar 'response.data' para obter o corpo da resposta da API.
    //    O tipo do 'data' é inferido como 'TodoWithRelations' por causa do <...>
    const response = await axiosInstance.patch<TodoWithRelations>("/todo/edit", payload);
    
    // 3. Retornar diretamente o objeto 'response.data'.
    return response.data;
  } catch (error) {
    // Relança o erro para que o `onError` da `useMutation` possa capturá-lo.
    throw error;
  }
};

export default todoEditRequest;
