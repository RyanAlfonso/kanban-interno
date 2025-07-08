import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/nextAuthOptions';
import { getLogger } from '@/logger';
import {
  updateProjectColumn,
  deleteProjectColumn,
  UpdateProjectColumnData,
} from '@/lib/services/projectColumn.service';
import prisma from '@/lib/prismadb'; // For authorization checks

export async function PUT(
  req: NextRequest,
  { params }: { params: { columnId: string } }
) {
  const logger = getLogger('info');
  try {
    const session = await getAuthSession();
    console.log(`DEBUG: PUT /api/project-columns/${params.columnId} - Session object:`, JSON.stringify(session, null, 2)); // DEBUGGING ROLE
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // @ts-ignore
    console.log(`DEBUG: PUT /api/project-columns/${params.columnId} - User role:`, session.user.role); // DEBUGGING ROLE
    // @ts-ignore // session.user.role will exist due to next-auth.d.ts and callback updates
    if (session.user.role !== 'ADMIN') {
      return new NextResponse('Forbidden: User is not an Admin', { status: 403 });
    }

    const { columnId } = params;
    if (!columnId) {
      return new NextResponse('Column ID is required', { status: 400 });
    }

    const body = await req.json();
    const { name, order }: UpdateProjectColumnData = body;

    if (name === undefined && order === undefined) {
      return new NextResponse('No data provided for update (name or order is required)', { status: 400 });
    }

    // Optional: Authorization check - ensure user has rights to modify this column
    // This might involve checking if the user owns the project the column belongs to.
    const columnToUpdate = await prisma.projectColumn.findUnique({
        where: { id: columnId },
        select: { projectId: true }
    });
    if (!columnToUpdate) {
        return new NextResponse(`Column with ID ${columnId} not found.`, { status: 404 });
    }
    // Example: const project = await prisma.project.findUnique({ where: { id: columnToUpdate.projectId }});
    // if (project && project.ownerId !== session.user.id) { // Assuming project has an ownerId
    //     return new NextResponse('Forbidden', { status: 403 });
    // }


    const updatedColumn = await updateProjectColumn(columnId, { name, order });
    return NextResponse.json(updatedColumn, { status: 200 });
  } catch (error) {
    logger.error(`Error updating column ${params.columnId}:`, error);
    if (error instanceof Error) {
        if (error.message.includes('already exists')) {
            return new NextResponse(error.message, { status: 409 }); // Conflict
        }
        if (error.message.includes('not found')) {
            return new NextResponse(error.message, { status: 404 });
        }
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { columnId: string } }
) {
  const logger = getLogger('info');
  try {
    const session = await getAuthSession();
    console.log(`DEBUG: DELETE /api/project-columns/${params.columnId} - Session object:`, JSON.stringify(session, null, 2)); // DEBUGGING ROLE
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // @ts-ignore
    console.log(`DEBUG: DELETE /api/project-columns/${params.columnId} - User role:`, session.user.role); // DEBUGGING ROLE
    // @ts-ignore
    if (session.user.role !== 'ADMIN') {
      return new NextResponse('Forbidden: User is not an Admin', { status: 403 });
    }

    const { columnId } = params;
    if (!columnId) {
      return new NextResponse('Column ID is required', { status: 400 });
    }

    // Optional: Authorization check (similar to PUT)
    const columnToDelete = await prisma.projectColumn.findUnique({
        where: { id: columnId },
        select: { projectId: true }
    });
    if (!columnToDelete) {
        return new NextResponse(`Column with ID ${columnId} not found.`, { status: 404 });
    }
    // Example: const project = await prisma.project.findUnique({ where: { id: columnToDelete.projectId }});
    // if (project && project.ownerId !== session.user.id) { // Assuming project has an ownerId
    //     return new NextResponse('Forbidden', { status: 403 });
    // }

    const deletedColumn = await deleteProjectColumn(columnId);
    // The service function `deleteProjectColumn` returns the deleted column.
    // For a DELETE operation, typically a 200 or 204 (No Content) is returned.
    // Returning the deleted object can be useful for client-side state updates.
    return NextResponse.json(deletedColumn, { status: 200 });
  } catch (error) {
    logger.error(`Error deleting column ${params.columnId}:`, error);
     if (error instanceof Error && error.message.includes('not found')) {
        return new NextResponse(error.message, { status: 404 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
