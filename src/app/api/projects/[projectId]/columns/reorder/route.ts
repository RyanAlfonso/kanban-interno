import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/nextAuthOptions';
import { getLogger } from '@/logger';
import { reorderProjectColumns } from '@/lib/services/projectColumn.service';
import prisma from '@/lib/prismadb'; // For authorization checks

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

    // Optional: Authorization check - ensure user has rights to modify this project's columns
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        // include: { members: { where: { userId: session.user.id } } } // Example authorization
    });

    if (!project) {
        return new NextResponse(`Project with ID ${projectId} not found.`, { status: 404 });
    }
    // Add authorization check here if project model has owners/members
    // e.g. if (!project.ownerId === session.user.id && !project.members.length) {
    //   return new NextResponse('Forbidden', { status: 403 });
    // }


    const updatedColumns = await reorderProjectColumns(projectId, orderedColumnIds);
    return NextResponse.json(updatedColumns, { status: 200 });
  } catch (error) {
    logger.error(`Error reordering columns for project ${params.projectId}:`, error);
    if (error instanceof Error) {
        // Errors from reorderProjectColumns (like ID mismatch) will be generic "Failed to reorder"
        // or specific (like project not found if service is enhanced)
        if (error.message.includes('Invalid column IDs') || error.message.includes('Failed to reorder')) {
             return new NextResponse(error.message, { status: 400 });
        }
         if (error.message.includes('not found')) { // If project itself not found by service
            return new NextResponse(error.message, { status: 404 });
        }
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
