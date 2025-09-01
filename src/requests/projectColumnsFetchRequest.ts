import { axiosInstance } from "@/lib/axios";
import { ProjectColumn } from "@prisma/client"; // Assuming ProjectColumn type is available

/**
 * Fetches project columns for a given project ID.
 * @param projectId The ID of the project.
 * @returns A promise that resolves to an array of ProjectColumn objects.
 */
const projectColumnsFetchRequest = async (
  projectId: string | null // Allow null if we might fetch all columns ever (though API doesn't support this)
): Promise<ProjectColumn[]> => {
  if (!projectId) {
    // Or handle as an error, or return empty array, depending on desired behavior
    // For now, if no projectId, means we can't fetch specific columns for it.
    console.warn("projectColumnsFetchRequest called without a projectId. Returning empty array.");
    return [];
  }
  try {
    const response = await axiosInstance.get(`/projects/${projectId}/columns`);
    return response.data as ProjectColumn[];
  } catch (error) {
    console.error(`Error fetching project columns for project ${projectId}:`, error);
    throw error; // Re-throw to be caught by react-query's onError
  }
};

export default projectColumnsFetchRequest;
