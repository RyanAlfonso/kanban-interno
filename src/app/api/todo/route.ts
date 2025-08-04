import { getAuthSession } from "@/lib/nextAuthOptions";
import { getLogger } from "@/logger";
import prisma from "@/lib/prismadb";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const url = new URL(req.url);
    const view = url.searchParams.get("view");
    const projectId = url.searchParams.get("projectId");

    let whereClause: any = { isDeleted: false };

    if (view === "mine") {
      whereClause.ownerId = session.user.id;
    }

    if (projectId && projectId !== "all") {
      whereClause.projectId = projectId;
    }

    const todos = await prisma.todo.findMany({
      where: whereClause,
      orderBy: { order: "asc" },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        project: { select: { id: true, name: true } },
        column: { select: { id: true, name: true, order: true } },
        tags: { select: { id: true, name: true, color: true } },
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
    logger.error("Error in GET /api/todo:", { error });
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
      tags,
      deadline,
      projectId,
      order,
      assignedToIds,
      parentId,
      linkedCardIds,
    } = body;

    if (
      !title ||
      !columnId ||
      order === undefined ||
      !deadline ||
      !assignedToIds
    ) {
      return new Response("Missing required fields", { status: 400 });
    }

    const newTodo = await prisma.todo.create({
      data: {
        title,
        description: description || null,
        columnId,
        order,
        deadline: new Date(deadline),
        projectId: projectId || null,
        ownerId: session.user.id,
        assignedToIds: assignedToIds || [],
        parentId: parentId || null,
        linkedCardIds: linkedCardIds || [],
        tags: {
          connect: tags?.map((tag: { id: string }) => ({ id: tag.id })) || [],
        },
      },
    });
    return new Response(JSON.stringify(newTodo), { status: 201 });
  } catch (error) {
    logger.error("Error in POST /api/todo:", { error });
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
    const { id, ...dataFromClient } = body;

    if (!id) {
      return new Response("Todo ID is required", { status: 400 });
    }

    const dataForPrismaUpdate: any = { ...dataFromClient };

    if (dataForPrismaUpdate.projectId === "")
      dataForPrismaUpdate.projectId = null;
    if (dataForPrismaUpdate.parentId === "")
      dataForPrismaUpdate.parentId = null;
    if (dataForPrismaUpdate.columnId === "")
      dataForPrismaUpdate.columnId = null;

    if (dataForPrismaUpdate.tags !== undefined) {
      if (Array.isArray(dataForPrismaUpdate.tags)) {
        dataForPrismaUpdate.tags = {
          set: dataForPrismaUpdate.tags.map((tag: { id: string }) => ({
            id: tag.id,
          })),
        };
      } else {
        delete dataForPrismaUpdate.tags;
      }
    }

    if (dataFromClient.columnId) {
      const currentTodo = await prisma.todo.findUnique({
        where: { id },
        select: { columnId: true },
      });
      if (
        currentTodo &&
        currentTodo.columnId &&
        currentTodo.columnId !== dataFromClient.columnId
      ) {
      }
    }

    const updatedTodo = await prisma.todo.update({
      where: { id: id },
      data: dataForPrismaUpdate,
      include: {
        owner: true,
        project: true,
        column: true,
        tags: true,
        movementHistory: true,
        parent: true,
        childTodos: true,
        attachments: true,
        comments: true,
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
  } catch (error: any) {
    logger.error("DETAILED ERROR in PUT /api/todo:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    return new Response(
      JSON.stringify({
        message: "Internal Server Error",
        error: { message: error.message, code: error.code, meta: error.meta },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
