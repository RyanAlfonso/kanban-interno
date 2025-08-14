import { getAuthSession } from '@/lib/nextAuthOptions';
import prisma from '@/lib/prismadb';
import { getLogger } from '@/logger';
import { NextRequest, NextResponse } from 'next/server';

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

    const { projectId } = params;
    if (!projectId) {
      return new NextResponse('Project ID is required', { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { 
        columns: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!project) {
      return new NextResponse(`Project with ID ${projectId} not found.`, { status: 404 });
    }

    const isAdmin = session.user.role === 'ADMIN';
    
    const backlogColumn = project.columns.find(col => col.order === 1);
    
    const canCreateColumn = isAdmin && !!backlogColumn;
    
    const response = {
      canCreateColumn,
      reason: !isAdmin 
        ? 'Apenas administradores podem criar colunas'
        : !backlogColumn 
        ? 'Projeto deve ter uma coluna Backlog primeiro'
        : 'Novas colunas só podem ser criadas no Backlog',
      hasBacklog: !!backlogColumn,
      isAdmin,
      totalColumns: project.columns.length
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error(error, `Error validating column creation for project ${params.projectId}:`);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}