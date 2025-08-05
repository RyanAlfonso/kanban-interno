import { axiosInstance } from "@/lib/axios";
import { TodoCreateRequest } from "@/lib/validators/todo";
import { Todo } from "@prisma/client";

const todoCreateRequest = async (payload: TodoCreateRequest) => {
  try {
    const result = await axiosInstance.post("/todo/create", payload);
    return result.data as Promise<Todo>;
  } catch (error) {
    throw error;
  }
};

export default todoCreateRequest;
