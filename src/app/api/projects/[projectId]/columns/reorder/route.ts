import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/nextAuthOptions';
import { getLogger } from '@/logger';
import { reorderProjectColumns } from '@/lib/services/projectColumn.service';
import prisma from '@/lib/prismadb';

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const logger = getLogger('info');
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { projectId } = params;
    if (!projectId) {
      return new NextResponse('Project ID is required', { status: 400 });
    }

    const body = await req.json();
    const { orderedColumnIds } = body;

    if (!Array.isArray(orderedColumnIds) || orderedColumnIds.some(id => typeof id !== 'string')) {
      return new NextResponse('orderedColumnIds must be an array of strings', {
        status: 400,
      });
    }

    const project = await prisma.project.findUnique({
        where: { id: projectId },
    });

    if (!project) {
        return new NextResponse(`Project with ID ${projectId} not found.`, { status: 404 });
    }


    const updatedColumns = await reorderProjectColumns(projectId, orderedColumnIds);
    return NextResponse.json(updatedColumns, { status: 200 });
  } catch (error) {
    logger.error(`Error reordering columns for project ${params.projectId}:`, error);
    if (error instanceof Error) {
        if (error.message.includes('Invalid column IDs') || error.message.includes('Failed to reorder')) {
             return new NextResponse(error.message, { status: 400 });
        }
         if (error.message.includes('not found')) {
            return new NextResponse(error.message, { status: 404 });
        }
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
