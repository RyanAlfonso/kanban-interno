import { axiosInstance } from "@/lib/axios";
import { ProjectColumn } from "@prisma/client";

/**
 * @param columnId
 * @returns
 */
const projectColumnDeleteRequest = async (
  columnId: string
): Promise<ProjectColumn> => {
  try {
    const response = await axiosInstance.delete(`/project-columns/${columnId}`);
    return response.data as ProjectColumn;
  } catch (error) {
    console.error(`Error deleting project column ${columnId}:`, error);
    throw error;
  }
};

export default projectColumnDeleteRequest;
