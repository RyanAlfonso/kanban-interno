import { axiosInstance } from "@/lib/axios";

const todoLabelFetchRequest = async () => {
  try {
    const result = await axiosInstance.get("/todo/label");
    return result.data as Promise<string[]>;
  } catch (error) {
    throw error;
  }
};

export default todoLabelFetchRequest;
