import { axiosInstance } from "@/lib/axios";
import { ProjectColumn } from "@prisma/client";

/**
 * Deletes a project column.
 * @param columnId The ID of the column to delete.
 * @returns A promise that resolves to the deleted ProjectColumn object (as returned by the API).
 */
const projectColumnDeleteRequest = async (
  columnId: string
): Promise<ProjectColumn> => {
  try {
    // The API endpoint is /api/project-columns/{columnId}
    const response = await axiosInstance.delete(`/project-columns/${columnId}`);
    return response.data as ProjectColumn; // API returns the deleted column
  } catch (error) {
    console.error(`Error deleting project column ${columnId}:`, error);
    throw error; // Re-throw to be caught by react-query's useMutation
  }
};

export default projectColumnDeleteRequest;
