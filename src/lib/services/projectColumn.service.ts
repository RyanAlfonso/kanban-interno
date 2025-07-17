import prisma from '../prismadb';
import { ProjectColumn } from '@prisma/client';

// Type for creating a new project column - adjust as needed for required fields
export interface CreateProjectColumnData {
  name: string;
  order: number;
  projectId: string;
}


/**
 * Retrieves all columns for a given project, ordered by their 'order' field.
 * @param projectId - The ID of the project.
 * @returns A list of project columns.
 */
export async function getProjectColumns(
  projectId: string,
  areaId?: string
): Promise<ProjectColumn[]> {
  if (areaId) {
    return prisma.projectColumn.findMany({
      where: {
        areaId: areaId,
        projectId: projectId,
      },
      orderBy: {
        order: 'asc',
      },
    });
  }

  return prisma.projectColumn.findMany({
    where: {
      projectId: projectId,
    },
    orderBy: {
      order: 'asc',
    },
  });
}

// Type for updating an existing project column
export interface UpdateProjectColumnData {
  name?: string;
  order?: number;
}

/**
 * Updates an existing project column.
 * @param columnId - The ID of the column to update.
 * @param data - The data to update (name, order).
 * @returns The updated project column.
 * @throws Error if the column is not found or if a unique constraint is violated (e.g., duplicate name in project).
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
    // First, retrieve the column to get its projectId if we need to check for name uniqueness
    const existingColumn = await prisma.projectColumn.findUnique({
      where: { id: columnId },
    });

    if (!existingColumn) {
      throw new Error(`ProjectColumn with ID ${columnId} not found.`);
    }

    // If name is being changed, we need to ensure it's unique within the project
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
      // This specific check might be redundant due to the manual check above,
      // but kept for safety in case of race conditions or other scenarios.
      throw new Error(
        `A column with the name "${data.name}" already exists in the project.`
      );
    }
    if (error.code === 'P2025') { // Record to update not found
        throw new Error(`ProjectColumn with ID ${columnId} not found.`);
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Deletes a project column.
 * Associated Todos will have their columnId set to null due to schema's onDelete: SetNull.
 * @param columnId - The ID of the column to delete.
 * @returns The deleted project column.
 * @throws Error if the column is not found.
 */
export async function deleteProjectColumn(
  columnId: string
): Promise<ProjectColumn> {
  try {
    // Check if column exists before attempting to delete
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
    if (error.code === 'P2025') { // Record to delete not found
      throw new Error(`ProjectColumn with ID ${columnId} not found.`);
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Reorders the columns for a given project.
 * @param projectId - The ID of the project whose columns are to be reordered.
 * @param orderedColumnIds - An array of column IDs in the new desired order.
 * @returns A list of the updated project columns in the new order.
 * @throws Error if any columnId is invalid, doesn't belong to the project, or if counts don't match.
 */
export async function reorderProjectColumns(
  projectId: string,
  orderedColumnIds: string[]
): Promise<ProjectColumn[]> {
  // Validate that all columns belong to the specified project
  const columns = await prisma.projectColumn.findMany({
    where: { projectId: projectId },
    select: { id: true, order: true }, // Select only necessary fields
  });

  const existingColumnIds = columns.map(c => c.id);
  const allFound = orderedColumnIds.every(id => existingColumnIds.includes(id));

  if (!allFound || orderedColumnIds.length !== existingColumnIds.length) {
    throw new Error(
      'Invalid column IDs provided or mismatch in column count for the project.'
    );
  }

  // Perform updates in a transaction
  const updatePromises = orderedColumnIds.map((columnId, index) =>
    prisma.projectColumn.update({
      where: { id: columnId },
      data: { order: index }, // Use index as the new order
    })
  );

  try {
    await prisma.$transaction(updatePromises);
  } catch (error) {
    // Handle potential errors during transaction (e.g., a column was deleted concurrently)
    console.error("Error during column reordering transaction:", error);
    throw new Error("Failed to reorder columns. Please try again.");
  }

  // Return the updated columns in their new order
  return prisma.projectColumn.findMany({
    where: { projectId: projectId },
    orderBy: { order: 'asc' },
  });
}
