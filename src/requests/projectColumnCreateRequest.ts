import { axiosInstance } from "@/lib/axios";
import { ProjectColumn } from "@prisma/client";

export interface ProjectColumnCreatePayload {
  name: string;
  order: number;
}

/**
 * @param projectId
 * @param payload
 * @returns
 */
const projectColumnCreateRequest = async (
  projectId: string,
  payload: ProjectColumnCreatePayload
): Promise<ProjectColumn> => {
  try {
    const response = await axiosInstance.post(`/projects/${projectId}/columns`, payload);
    return response.data as ProjectColumn;
  } catch (error) {
    console.error(`Error creating project column for project ${projectId}:`, error);
    throw error;
  }
};

export default projectColumnCreateRequest;
