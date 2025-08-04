import { axiosInstance } from "@/lib/axios";
import { ProjectColumn } from "@prisma/client";

/**
 * @param projectId
 * @returns
 */
const projectColumnsFetchRequest = async (
  projectId: string | null 
): Promise<ProjectColumn[]> => {
  if (!projectId) {
    console.warn("projectColumnsFetchRequest called without a projectId. Returning empty array.");
    return [];
  }
  try {
    const response = await axiosInstance.get(`/projects/${projectId}/columns`);
    return response.data as ProjectColumn[];
  } catch (error) {
    console.error(`Error fetching project columns for project ${projectId}:`, error);
    throw error;
  }
};

export default projectColumnsFetchRequest;
