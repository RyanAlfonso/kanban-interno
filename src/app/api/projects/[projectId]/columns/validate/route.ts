// Path: kanban-interno/src/app/api/projects/[projectId]/columns/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/nextAuthOptions';
import { getLogger } from '@/logger';
import prisma from '@/lib/prismadb';

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

    // @ts-ignore
    const isAdmin = session.user.role === 'ADMIN';
    
    // Verifica se existe uma coluna Backlog (order = 1)
    const backlogColumn = project.columns.find(col => col.order === 1);
    
    // Só permite criação se:
    // 1. Usuário é admin
    // 2. E existe um Backlog (para inserir novas colunas nele)
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
    logger.error(`Error validating column creation for project ${params.projectId}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}