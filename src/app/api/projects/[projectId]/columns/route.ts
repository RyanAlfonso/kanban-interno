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

    const url = new URL(req.url);
    const areaId = url.searchParams.get('areaId') || undefined;

    // Optional: Check if the user has access to this project before fetching columns
    // This depends on your authorization rules (e.g., is user a member of the project?)
    // For now, we assume if they have the projectId, they can view its columns if they are authenticated.

    const columns = await getProjectColumns(projectId, areaId);
    return NextResponse.json(columns, { status: 200 });
  } catch (error) {
    logger.error(`Error fetching columns for project ${params.projectId}:`, error);
    if (error instanceof Error && error.message.includes('not found')) { // Or specific error types from service
        return new NextResponse(error.message, { status: 404 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

