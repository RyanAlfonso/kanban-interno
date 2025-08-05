import { axiosInstance } from "@/lib/axios";
import { TodoDeleteRequest } from "@/lib/validators/todo";
import { Todo } from "@prisma/client";

const todoDeleteRequest = async (payload: TodoDeleteRequest) => {
  try {
    const { data }: { data: Todo[] } = await axiosInstance.delete("/todo/delete", {
      data: payload,
    });

    return data;
  } catch (error) {
    throw error;
  }
};

export default todoDeleteRequest;
