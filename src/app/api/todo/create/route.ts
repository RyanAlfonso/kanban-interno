
import { getAuthSession } from "@/lib/nextAuthOptions";
import prisma from "@/lib/prismadb";
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
      tags,
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

    const order = await getNextOrderInColumn(columnId);


    const createData = {
      title,
      description,
      column: { connect: { id: columnId } },
      project: { connect: { id: projectColumn.projectId } },
      tags,
      order,
      owner: { connect: { id: session.user.id } },
      assignedToIds,
      linkedCardIds,
      deadline,
      ...(parentId && { parent: { connect: { id: parentId } } }),
    };

    const result = await prisma.todo.create({
      data: createData,
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

