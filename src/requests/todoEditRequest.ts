import { axiosInstance } from "@/lib/axios";
import { TodoEditRequest } from "@/lib/validators/todo";
import { TodoWithRelations } from "@/types/todo";

/**
 * @param payload
 * @returns
 */
const todoEditRequest = async (payload: TodoEditRequest): Promise<TodoWithRelations> => {
  try {
    const response = await axiosInstance.put<TodoWithRelations>("/todo", payload);

    return response.data;
  } catch (error) {
    throw error;
  }
};

export default todoEditRequest;
