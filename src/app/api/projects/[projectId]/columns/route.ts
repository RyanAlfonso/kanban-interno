import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/nextAuthOptions';
import { getLogger } from '@/logger';
import {
  createProjectColumn,
  getProjectColumns,
  CreateProjectColumnData,
} from '@/lib/services/projectColumn.service';
import prisma from '@/lib/prismadb'; // For checking project ownership/existence

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const logger = getLogger('info');
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // A VERIFICAÇÃO DE ADMIN FOI REMOVIDA DAQUI PARA PERMITIR QUE TODOS OS USUÁRIOS LOGADOS VEJAM AS COLUNAS

    const { projectId } = params;
    if (!projectId) {
      return new NextResponse('Project ID is required', { status: 400 });
    }

    // Optional: Check if the user has access to this project before fetching columns
    // This depends on your authorization rules (e.g., is user a member of the project?)
    // For now, we assume if they have the projectId, they can view its columns if they are authenticated.

    const columns = await getProjectColumns(projectId);
    return NextResponse.json(columns, { status: 200 });
  } catch (error) {
    logger.error(`Error fetching columns for project ${params.projectId}:`, error);
    if (error instanceof Error && error.message.includes('not found')) { // Or specific error types from service
        return new NextResponse(error.message, { status: 404 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const logger = getLogger('info');
  try {
    const session = await getAuthSession();
    console.log(`DEBUG: POST /api/projects/${params.projectId}/columns - Session object:`, JSON.stringify(session, null, 2)); // DEBUGGING ROLE
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // @ts-ignore
    console.log(`DEBUG: POST /api/projects/${params.projectId}/columns - User role:`, session.user.role); // DEBUGGING ROLE
    // @ts-ignore
    if (session.user.role !== 'ADMIN') {
      return new NextResponse('Forbidden: User is not an Admin', { status: 403 });
    }

    const { projectId } = params;
    if (!projectId) {
      return new NextResponse('Project ID is required', { status: 400 });
    }

    const body = await req.json();
    const { name, order } = body;

    if (!name || order === undefined) {
      return new NextResponse('Missing required fields: name, order', {
        status: 400,
      });
    }

    // Optional: Check if user is owner/member of the project before allowing column creation
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


    const columnData: CreateProjectColumnData = {
      name,
      order,
      projectId,
    };

    const newColumn = await createProjectColumn(columnData);
    return NextResponse.json(newColumn, { status: 201 });
  } catch (error) {
    logger.error(`Error creating column for project ${params.projectId}:`, error);
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
