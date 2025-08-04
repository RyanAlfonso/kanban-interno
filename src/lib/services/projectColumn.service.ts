import prisma from '../prismadb';
import { ProjectColumn } from '@prisma/client';

// Type for creating a new project column - adjust as needed for required fields
export interface CreateProjectColumnData {
  name: string;
  order: number;
  projectId: string;
}

/**
 * Creates a new column for a project.
 * @param data - The data for the new column (name, order, projectId).
 * @returns The created project column.
 * @throws Error if the project is not found or if a column with the same name already exists for the project.
 */
export async function createProjectColumn(
  data: CreateProjectColumnData
): Promise<ProjectColumn> {
  const { name, order, projectId } = data;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error(`Project with ID ${projectId} not found.`);
  }


  try {
    const newColumn = await prisma.projectColumn.create({
      data: {
        name,
        order,
        projectId,
      },
    });
    return newColumn;
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('projectId') && error.meta?.target?.includes('name')) {
      throw new Error(`A column with the name "${name}" already exists in project ${projectId}.`);
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * @param projectId - The ID of the project.
 * @returns A list of project columns.
 */
export async function getProjectColumns(
  projectId: string
): Promise<ProjectColumn[]> {
  return prisma.projectColumn.findMany({
    where: {
      projectId: projectId,
    },
    orderBy: {
      order: 'asc',
    },
  });
}

export interface UpdateProjectColumnData {
  name?: string;
  order?: number;
}

/**
 * Updates an existing project column.
 * @param columnId 
 * @param data
 * @returns 
 * @throws
 */
export async function updateProjectColumn(
  columnId: string,
  data: UpdateProjectColumnData
): Promise<ProjectColumn> {
  const { name, order } = data;

  if (name === undefined && order === undefined) {
    throw new Error('No data provided for update.');
  }

  try {
    const existingColumn = await prisma.projectColumn.findUnique({
      where: { id: columnId },
    });

    if (!existingColumn) {
      throw new Error(`ProjectColumn with ID ${columnId} not found.`);
    }

    if (name !== undefined && name !== existingColumn.name) {
      const conflictingColumn = await prisma.projectColumn.findUnique({
        where: {
          projectId_name: {
            projectId: existingColumn.projectId,
            name: name,
          },
        },
      });
      if (conflictingColumn) {
        throw new Error(
          `A column with the name "${name}" already exists in project ${existingColumn.projectId}.`
        );
      }
    }

    const updatedColumn = await prisma.projectColumn.update({
      where: { id: columnId },
      data: {
        name: name,
        order: order,
      },
    });
    return updatedColumn;
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('projectId') && error.meta?.target?.includes('name')) {
      throw new Error(
        `A column with the name "${data.name}" already exists in the project.`
      );
    }
    if (error.code === 'P2025') {
        throw new Error(`ProjectColumn with ID ${columnId} not found.`);
    }
    throw error;
  }
}

/**
 * @param columnId
 * @returns 
 * @throws
 */
export async function deleteProjectColumn(
  columnId: string
): Promise<ProjectColumn> {
  try {
    const existingColumn = await prisma.projectColumn.findUnique({
        where: { id: columnId },
    });

    if (!existingColumn) {
        throw new Error(`ProjectColumn with ID ${columnId} not found.`);
    }

    const deletedColumn = await prisma.projectColumn.delete({
      where: { id: columnId },
    });
    return deletedColumn;
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw new Error(`ProjectColumn with ID ${columnId} not found.`);
    }
    throw error;
  }
}

/**
 * Reorders the columns for a given project.
 * @param projectId 
 * @param orderedColumnIds
 * @returns 
 * @throws
 */
export async function reorderProjectColumns(
  projectId: string,
  orderedColumnIds: string[]
): Promise<ProjectColumn[]> {
  const columns = await prisma.projectColumn.findMany({
    where: { projectId: projectId },
    select: { id: true, order: true },
  });

  const existingColumnIds = columns.map(c => c.id);
  const allFound = orderedColumnIds.every(id => existingColumnIds.includes(id));

  if (!allFound || orderedColumnIds.length !== existingColumnIds.length) {
    throw new Error(
      'Invalid column IDs provided or mismatch in column count for the project.'
    );
  }

  const updatePromises = orderedColumnIds.map((columnId, index) =>
    prisma.projectColumn.update({
      where: { id: columnId },
      data: { order: index },
    })
  );

  try {
    await prisma.$transaction(updatePromises);
  } catch (error) {
    console.error("Error during column reordering transaction:", error);
    throw new Error("Failed to reorder columns. Please try again.");
  }

  return prisma.projectColumn.findMany({
    where: { projectId: projectId },
    orderBy: { order: 'asc' },
  });
}
