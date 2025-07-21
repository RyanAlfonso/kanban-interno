import { axiosInstance } from "@/lib/axios";
import { TodoArchiveRequest } from "@/lib/validators/todo";
import { Todo } from "@prisma/client";

const todoArchiveRequest = async (payload: TodoArchiveRequest) => {
  try {
    const { data }: { data: Todo[] } = await axiosInstance.patch("/todo/archive", payload);

    return data;
  } catch (error) {
    throw error;
  }
};

export default todoArchiveRequest;

