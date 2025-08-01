// Caminho completo: kanban-interno/src/app/api/todo/route.ts

import { getAuthSession } from "@/lib/nextAuthOptions";
import { getLogger } from "@/logger";
import prisma from "@/lib/prismadb";
import { NextRequest } from "next/server";
import { isValidTag, PREDEFINED_TAGS } from "@/lib/tags";
import { canMoveCard } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();

    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const url = new URL(req.url);
    const view = url.searchParams.get("view");
    const projectId = url.searchParams.get("projectId");

    let whereClause: any = {
      isDeleted: false,
    };

    if (view === "mine") {
      whereClause.ownerId = session.user.id;
    }

    if (projectId && projectId !== "all") {
      whereClause.projectId = projectId;
    }

    const todos = await prisma.todo.findMany({
      where: whereClause,
      orderBy: {
        order: "asc",
      },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        project: { select: { id: true, name: true } },
        column: { select: { id: true, name: true, order: true } },
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
        attachments: {
          include: {
            uploadedBy: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        comments: {
          include: {
            author: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const todosWithRelations = await Promise.all(
      todos.map(async (todo) => {
        const assignedUsers = await prisma.user.findMany({
          where: { id: { in: todo.assignedToIds } },
          select: { id: true, name: true, email: true, image: true },
        });
        const linkedCards = await prisma.todo.findMany({
          where: { id: { in: todo.linkedCardIds } },
          select: { id: true, title: true },
        });
        return { ...todo, assignedTo: assignedUsers, linkedCards: linkedCards };
      })
    );

    return new Response(JSON.stringify(todosWithRelations), { status: 200 });
  } catch (error) {
    logger.error("Error fetching todos:", { error });
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const {
      title,
      description,
      columnId,
      label,
      tags,
      deadline,
      projectId,
      order,
      assignedToIds,
      parentId,
      linkedCardIds,
    } = body;

    if (!title || !columnId || order === undefined) {
      return new Response("Missing required fields: title, columnId, order", {
        status: 400,
      });
    }
    if (
      !assignedToIds ||
      !Array.isArray(assignedToIds) ||
      assignedToIds.length === 0
    ) {
      return new Response(
        "Missing required field: assignedToIds (must be a non-empty array)",
        { status: 400 }
      );
    }
    if (!deadline) {
      return new Response("Missing required field: deadline", { status: 400 });
    }
    const parsedDeadline = new Date(deadline);
    if (isNaN(parsedDeadline.getTime())) {
      return new Response("Invalid deadline format. Must be a valid date.", {
        status: 400,
      });
    }
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        if (!isValidTag(tag)) {
          return new Response(
            `Invalid tag: ${tag}. Allowed tags are: ${PREDEFINED_TAGS.join(
              ", "
            )}`,
            { status: 400 }
          );
        }
      }
    } else if (tags) {
      return new Response("Tags must be an array of strings.", { status: 400 });
    }
    if (columnId && projectId) {
      const column = await prisma.projectColumn.findUnique({
        where: { id: columnId },
        select: { projectId: true },
      });
      if (!column || column.projectId !== projectId) {
        return new Response("Column does not belong to the specified project", {
          status: 400,
        });
      }
    }
    const validUsers = await prisma.user.findMany({
      where: { id: { in: assignedToIds } },
      select: { id: true },
    });
    if (validUsers.length !== assignedToIds.length) {
      return new Response("One or more assigned user IDs are invalid", {
        status: 400,
      });
    }
    const newTodo = await prisma.todo.create({
      data: {
        title,
        description: description || null,
        columnId,
        label: label || [],
        tags: tags || [],
        deadline: parsedDeadline,
        projectId: projectId || null,
        order,
        ownerId: session.user.id,
        assignedToIds: assignedToIds || [],
        parentId: parentId || null,
        linkedCardIds: linkedCardIds || [],
      },
    });
    return new Response(JSON.stringify(newTodo), { status: 201 });
  } catch (error) {
    logger.error("Error creating todo:", { error });
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { id, columnId, ...otherData } = body;

    if (!id) {
      return new Response("Todo ID is required", { status: 400 });
    }

    const currentTodo = await prisma.todo.findUnique({
      where: { id },
      select: { columnId: true },
    });

    if (!currentTodo) {
      return new Response("Tarefa não encontrada.", { status: 404 });
    }

    const dataForPrismaUpdate: any = { ...otherData };
    const isMovingCard =
      columnId && currentTodo.columnId && currentTodo.columnId !== columnId;

    if (isMovingCard) {
      let hasPermission = false;
      let permissionError = "Você não tem permissão para realizar esta ação.";

      if (session.user.role === "ADMIN") {
        hasPermission = true;
      } else {
        const fromColumn = await prisma.projectColumn.findUnique({
          where: { id: currentTodo.columnId! },
          select: { name: true },
        });
        const toColumn = await prisma.projectColumn.findUnique({
          where: { id: columnId },
          select: { name: true },
        });

        if (!fromColumn || !toColumn) {
          return new Response("Coluna de origem ou destino não encontrada.", {
            status: 404,
          });
        }

        const permissionCheck = canMoveCard(
          fromColumn.name,
          toColumn.name,
          session.user.type
        );
        
        if (permissionCheck.allowed) {
          hasPermission = true;
        } else {
          // CORREÇÃO APLICADA AQUI
          permissionError = permissionCheck.error || "Movimento não permitido pelas regras do projeto.";
        }
      }

      if (!hasPermission) {
        return new Response(permissionError, { status: 403 });
      }

      dataForPrismaUpdate.columnId = columnId;
      dataForPrismaUpdate.movementHistory = {
        create: {
          movedById: session.user.id,
          fromColumnId: currentTodo.columnId!,
          toColumnId: columnId,
        },
      };
    }

    const updatedTodo = await prisma.todo.update({
      where: { id: id },
      data: dataForPrismaUpdate,
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
        attachments: {
          include: {
            uploadedBy: { select: { id: true, name: true, image: true } },
          },
        },
        comments: {
          include: {
            author: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });

    const assignedUsers = await prisma.user.findMany({
      where: { id: { in: updatedTodo.assignedToIds } },
      select: { id: true, name: true, email: true, image: true },
    });
    const linkedCards = await prisma.todo.findMany({
      where: { id: { in: updatedTodo.linkedCardIds } },
      select: { id: true, title: true },
    });

    const resultWithRelations = {
      ...updatedTodo,
      assignedTo: assignedUsers,
      linkedCards: linkedCards,
    };

    return new Response(JSON.stringify(resultWithRelations), { status: 200 });
  } catch (error) {
    logger.error("Error updating todo:", { error });
    return new Response("Internal Server Error", { status: 500 });
  }
}
