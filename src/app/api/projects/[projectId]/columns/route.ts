import { getAuthSession } from '@/lib/nextAuthOptions';
import prisma from '@/lib/prismadb';
import {
  createProjectColumn,
  CreateProjectColumnData,
  getProjectColumns,
} from '@/lib/services/projectColumn.service';
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


    const columns = await getProjectColumns(projectId);
    return NextResponse.json(columns, { status: 200 });
  } catch (error) {
    logger.error(error, `Error fetching columns for project ${params.projectId}:`);
    if (error instanceof Error && error.message.includes('not found')) {
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
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

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

    const project = await prisma.project.findUnique({
        where: { id: projectId },
    });

    if (!project) {
        return new NextResponse(`Project with ID ${projectId} not found.`, { status: 404 });
    }


    const columnData: CreateProjectColumnData = {
      name,
      order,
      projectId,
    };

    const newColumn = await createProjectColumn(columnData);
    return NextResponse.json(newColumn, { status: 201 });
  } catch (error) {
    logger.error(error, `Error creating column for project ${params.projectId}:`);
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
