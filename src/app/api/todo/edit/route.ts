import { getAuthSession } from "@/lib/nextAuthOptions";
import prisma from "@/lib/prismadb";
import { Prisma } from "@prisma/client";
import { TodoEditValidator } from "@/lib/validators/todo";
import { getLogger } from "@/logger";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function PATCH(req: Request) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new Response("Não autorizado", { status: 401 });
    }

    const body = await req.json();
    const parsedBody = TodoEditValidator.parse(body);
    const { id, ...updateData } = parsedBody;

    const currentTodo = await prisma.todo.findUnique({
      where: { id },
      select: { ownerId: true, columnId: true, parentId: true },
    });

    if (!currentTodo) {
      return new Response("Tarefa não encontrada", { status: 404 });
    }
    if (currentTodo.ownerId !== session.user.id) {
      return new Response("Não autorizado", { status: 401 });
    }

    const dataToUpdate: Prisma.TodoUpdateInput = {};

    if (updateData.title) dataToUpdate.title = updateData.title;
    if (updateData.description !== undefined)
      dataToUpdate.description = updateData.description;
    if (updateData.label) dataToUpdate.label = updateData.label;
    if (updateData.tags) dataToUpdate.tags = updateData.tags;
    if (updateData.assignedToIds)
      dataToUpdate.assignedToIds = updateData.assignedToIds;
    if (updateData.linkedCardIds)
      dataToUpdate.linkedCardIds = updateData.linkedCardIds;
    if (updateData.referenceDocument !== undefined)
      dataToUpdate.referenceDocument = updateData.referenceDocument;

    if (updateData.deadline) {
      dataToUpdate.deadline = new Date(updateData.deadline);
    }

    if (updateData.parentId !== undefined) {
      if (updateData.parentId) {
        dataToUpdate.parent = { connect: { id: updateData.parentId } };
      } else if (currentTodo.parentId) {
        dataToUpdate.parent = { disconnect: true };
      }
    }

    if (
      updateData.columnId &&
      currentTodo.columnId &&
      updateData.columnId !== currentTodo.columnId
    ) {
      dataToUpdate.column = { connect: { id: updateData.columnId } };
      dataToUpdate.movementHistory = {
        create: {
          movedBy: { connect: { id: session.user.id } },
          fromColumn: { connect: { id: currentTodo.columnId } },
          toColumn: { connect: { id: updateData.columnId } },
          movedAt: new Date(),
        },
      };
    } else if (updateData.columnId && !currentTodo.columnId) {
      dataToUpdate.column = { connect: { id: updateData.columnId } };
    }

    logger.info(
      "--- API Backend (PATCH /edit): Dados sendo enviados para o Prisma update ---",
      JSON.stringify(dataToUpdate, null, 2)
    );

    const updatedTodo = await prisma.todo.update({
      where: { id },
      data: dataToUpdate,
      include: {
        project: true,
        column: true,
        owner: true,
        movementHistory: {
          include: {
            movedBy: { select: { id: true, name: true } },
            fromColumn: { select: { id: true, name: true } },
            toColumn: { select: { id: true, name: true } },
          },
          orderBy: { movedAt: "asc" },
        },
        parent: { select: { id: true, title: true } },
        childTodos: { select: { id: true, title: true } },
      },
    });

    const assignedUsers = await prisma.user.findMany({
      where: {
        id: { in: updatedTodo.assignedToIds },
      },
      select: { id: true, name: true, email: true, image: true },
    });

    const resultWithAssignedUsers = {
      ...updatedTodo,
      assignedTo: assignedUsers,
    };

    revalidatePath("/dashboard");
    revalidatePath("/");

    return new Response(JSON.stringify(resultWithAssignedUsers), {
      status: 200,
    });
  } catch (error) {
    logger.error(error);
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 400 });
    }
    return new Response("Erro Interno do Servidor", { status: 500 });
  }
}
