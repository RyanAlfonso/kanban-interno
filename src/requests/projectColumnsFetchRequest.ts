import { axiosInstance } from "@/lib/axios";
import { ProjectColumn } from "@prisma/client"; // Assuming ProjectColumn type is available

/**
 * Fetches project columns for a given project ID.
 * @param projectId The ID of the project.
 * @returns A promise that resolves to an array of ProjectColumn objects.
 */
const projectColumnsFetchRequest = async (
  projectId: string | null,
  areaId?: string | null
): Promise<ProjectColumn[]> => {
  if (!projectId) {
    console.warn("projectColumnsFetchRequest called without a projectId. Returning empty array.");
    return [];
  }
  try {
    const response = await axiosInstance.get(`/projects/${projectId}/columns`, {
      params: { areaId },
    });
    return response.data as ProjectColumn[];
  } catch (error) {
    console.error(`Error fetching project columns for project ${projectId}:`, error);
    throw error;
  }
};

export default projectColumnsFetchRequest;
