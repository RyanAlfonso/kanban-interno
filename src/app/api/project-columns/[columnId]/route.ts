import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/nextAuthOptions';
import { getLogger } from '@/logger';
import {
  updateProjectColumn,
  deleteProjectColumn,
  UpdateProjectColumnData,
} from '@/lib/services/projectColumn.service';
import prisma from '@/lib/prismadb';

export async function PUT(
  req: NextRequest,
  { params }: { params: { columnId: string } }
) {
  const logger = getLogger('info');
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

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

    const columnToUpdate = await prisma.projectColumn.findUnique({
        where: { id: columnId },
        select: { projectId: true }
    });
    if (!columnToUpdate) {
        return new NextResponse(`Column with ID ${columnId} not found.`, { status: 404 });
    }


    const updatedColumn = await updateProjectColumn(columnId, { name, order });
    return NextResponse.json(updatedColumn, { status: 200 });
  } catch (error) {
    logger.error(`Error updating column ${params.columnId}:`, error);
    if (error instanceof Error) {
        if (error.message.includes('already exists')) {
            return new NextResponse(error.message, { status: 409 });
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
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return new NextResponse('Forbidden: User is not an Admin', { status: 403 });
    }

    const { columnId } = params;
    if (!columnId) {
      return new NextResponse('Column ID is required', { status: 400 });
    }

    const columnToDelete = await prisma.projectColumn.findUnique({
        where: { id: columnId },
        select: { projectId: true }
    });
    if (!columnToDelete) {
        return new NextResponse(`Column with ID ${columnId} not found.`, { status: 404 });
    }

    const deletedColumn = await deleteProjectColumn(columnId);
    return NextResponse.json(deletedColumn, { status: 200 });
  } catch (error) {
    logger.error(`Error deleting column ${params.columnId}:`, error);
     if (error instanceof Error && error.message.includes('not found')) {
        return new NextResponse(error.message, { status: 404 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
