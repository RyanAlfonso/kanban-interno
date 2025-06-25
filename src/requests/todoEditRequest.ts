import { axiosInstance } from "@/lib/axios";
import { TodoEditRequest } from "@/lib/validators/todo";
import { Todo } from "@prisma/client";

const todoEditRequest = async (payload: TodoEditRequest) => {
  try {
    const result = await axiosInstance.patch("/todo/edit", payload);
    return result.data as Promise<Todo[]>;
  } catch (error) {
    throw error;
  }
};

export default todoEditRequest;
