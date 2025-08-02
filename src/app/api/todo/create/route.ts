// /src/app/api/todo/create/route.ts (versão final e limpa)

import { getAuthSession } from "@/lib/nextAuthOptions";
import prisma from "@/lib/prismadb"; // Importe o prisma com o middleware
import { TodoCreateValidator } from "@/lib/validators/todo";
import { getLogger } from "@/logger";
import { z } from "zod";

export async function POST(req: Request) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();

    const {
      title,
      description = "",
      columnId,
      deadline,
      tagIds = [],
      assignedToIds,
      parentId,
      linkedCardIds,
    } = TodoCreateValidator.parse(body);

    const projectColumn = await prisma.projectColumn.findUnique({
      where: { id: columnId },
      select: { projectId: true },
    });

    if (!projectColumn) {
      return new Response("Project column not found", { status: 404 });
    }

    // Verificar se as tags existem e pertencem ao projeto
    if (tagIds.length > 0) {
      const tags = await prisma.tag.findMany({
        where: {
          id: { in: tagIds },
          projectId: projectColumn.projectId
        }
      });

      if (tags.length !== tagIds.length) {
        return new Response("One or more tags not found or don't belong to this project", { status: 400 });
      }
    }

    const order = await getNextOrderInColumn(columnId);

    const createData = {
      title,
      description,
      column: { connect: { id: columnId } },
      project: { connect: { id: projectColumn.projectId } },
      order,
      owner: { connect: { id: session.user.id } },
      assignedToIds,
      linkedCardIds,
      deadline,
      ...(parentId && { parent: { connect: { id: parentId } } }),
      ...(tagIds.length > 0 && { 
        tags: { 
          connect: tagIds.map(id => ({ id })) 
        } 
      }),
    };

    const result = await prisma.todo.create({
      data: createData,
      include: {
        tags: true,
        owner: true,
        column: true,
        project: true
      }
    });

    return new Response(JSON.stringify(result), { status: 201 });

  } catch (error) {
    logger.error({ error }, "Error creating todo");
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 400 });
    }
    return new Response("Internal Server Error", { status: 500 });
  }
}

async function getNextOrderInColumn(columnId: string): Promise<number> {
  const lastTodo = await prisma.todo.findFirst({
    where: { columnId, isDeleted: false },
    orderBy: { order: "desc" },
  });
  return lastTodo ? lastTodo.order + 1 : 1;
}
