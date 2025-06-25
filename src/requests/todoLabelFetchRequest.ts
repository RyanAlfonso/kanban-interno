import { axiosInstance } from "@/lib/axios";

// Define Label type to match frontend assumption
interface Label {
  id: string;
  name: string;
  color: string;
}

const todoLabelFetchRequest = async (): Promise<Label[]> => {
  try {
    // Ensure the API endpoint /api/todo/label returns data conforming to Label[]
    const result = await axiosInstance.get("/api/todo/label");
    return result.data as Label[]; // Expecting the backend to return the full label objects
  } catch (error) {
    console.error("Error fetching labels:", error);
    // It's often better to return an empty array or throw a custom error
    // depending on how the calling code handles errors.
    // For useQuery, throwing the error is usually fine.
    throw error;
  }
};

export default todoLabelFetchRequest;
