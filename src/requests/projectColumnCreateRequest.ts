import { axiosInstance } from "@/lib/axios";
import { ProjectColumn } from "@prisma/client"; // Assuming ProjectColumn type

// Define the payload type for creating a project column
// Matches CreateProjectColumnData from the service, but for client-side request
export interface ProjectColumnCreatePayload {
  name: string;
  order: number;
  // projectId is part of the URL, not the payload body for this specific API endpoint
}

/**
 * Creates a new project column.
 * @param projectId The ID of the project to add the column to.
 * @param payload The data for the new column (name, order).
 * @returns A promise that resolves to the created ProjectColumn object.
 */
const projectColumnCreateRequest = async (
  projectId: string,
  payload: ProjectColumnCreatePayload
): Promise<ProjectColumn> => {
  try {
    // The API endpoint is /api/projects/{projectId}/columns
    const response = await axiosInstance.post(`/projects/${projectId}/columns`, payload);
    return response.data as ProjectColumn;
  } catch (error) {
    console.error(`Error creating project column for project ${projectId}:`, error);
    throw error; // Re-throw to be caught by react-query's useMutation
  }
};

export default projectColumnCreateRequest;
