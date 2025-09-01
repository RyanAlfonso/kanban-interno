import { getAuthSession } from "@/lib/nextAuthOptions";
import { canMoveCard } from "@/lib/permissions";
import prisma from "@/lib/prismadb";
import { getLogger } from "@/logger";
import { NextRequest, NextResponse } from "next/server";
import { TodoCreateValidator, TodoEditValidator } from "@/lib/validators/todo";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse("Não autenticado", { status: 401 });
    }

    const url = new URL(req.url);

    const view = url.searchParams.get("view");
    const projectId = url.searchParams.get("projectId");
    const assignedToIds = url.searchParams
      .get("assignedToIds")
      ?.split(",")
      .filter(Boolean);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const searchQuery = url.searchParams.get("q");
    const tagsParam = url.searchParams.get("tags");
    const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : null;

    let whereClause: any = {
      isDeleted: false,
    };

    if (view === "mine") whereClause.ownerId = session.user.id;
    if (projectId && projectId !== "all") whereClause.projectId = projectId;
    if (assignedToIds && assignedToIds.length > 0)
      whereClause.assignedToIds = { hasSome: assignedToIds };

    if (startDate || endDate) {
      whereClause.deadline = {};
      if (startDate) whereClause.deadline.gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        whereClause.deadline.lte = endOfDay;
      }
    }

    if (searchQuery) {
      whereClause.OR = [
        { title: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    // --- CORREÇÃO NO FILTRO DE TAGS ---
    // Agora filtramos pela relação, verificando se 'alguma' das tags
    // relacionadas tem seu ID na lista de tags fornecida.
    if (tags && tags.length > 0) {
      whereClause.tags = {
        some: {
          id: {
            in: tags,
          },
        },
      };
    }

    const todos = await prisma.todo.findMany({
      where: whereClause,
      orderBy: { order: "asc" },
      include: {
        // --- CORREÇÃO NO INCLUDE ---
        // Adicionado 'tags: true' para garantir que os objetos Tag sejam incluídos na resposta.
        tags: true,
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

    return NextResponse.json(todosWithRelations);
  } catch (error) {
    logger.error({ error }, "Error fetching todos:");
    return new NextResponse("Internal Server Error", { status: 500 });
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
      tags, // 'tags' aqui será um array de IDs
      deadline,
      projectId,
      order,
      assignedToIds,
      parentId,
      linkedCardIds,
      checklist,
    } = TodoCreateValidator.parse(body);

    // ... (lógica de validação da coluna 'Em execução')

    // --- CORREÇÃO NA CRIAÇÃO (POST) ---
    const dataToCreate: any = {
      title,
      description,
      columnId,
      label,
      // tags: tags, // REMOVIDO: A forma antiga não funciona mais
      projectId,
      order: order ?? 0,
      ownerId: session.user.id,
      assignedToIds,
      parentId,
      linkedCardIds,
      checklist: checklist || [],
      // Adiciona a conexão com as tags existentes
      ...(tags &&
        tags.length > 0 && {
          tags: {
            connect: tags.map((tagId: string) => ({ id: tagId })),
          },
        }),
    };

    if (deadline) {
      dataToCreate.deadline = deadline;
    }

    const newTodo = await prisma.todo.create({
      data: dataToCreate,
    });
    return new Response(JSON.stringify(newTodo), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 });
    }
    logger.error({ error }, "Error creating todo:");
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

    const {
      id,
      columnId,
      title,
      description,
      label,
      tags, // 'tags' aqui será um array de IDs
      deadline,
      projectId,
      order,
      assignedToIds,
      parentId,
      linkedCardIds,
      checklist,
    } = TodoEditValidator.parse(body);

    const currentTodo = await prisma.todo.findUnique({
      where: { id },
      select: { columnId: true, deadline: true },
    });

    if (!currentTodo) {
      return new Response("Tarefa não encontrada.", { status: 404 });
    }

    // --- CORREÇÃO NA ATUALIZAÇÃO (PUT) ---
    const dataForPrismaUpdate: any = {
      title,
      description,
      label,
      // tags: tags, // REMOVIDO: A forma antiga não funciona mais
      deadline,
      order,
      assignedToIds,
      linkedCardIds,
      ...(checklist !== undefined && { checklist }),
      projectId: projectId === "" ? null : projectId,
      parentId: parentId === "" ? null : parentId,
    };

    // Adiciona a lógica para conectar/desconectar tags
    if (tags) {
      dataForPrismaUpdate.tags = {
        // 'set' é a forma mais segura de sincronizar. Ele desconecta as tags que não estão na lista
        // e conecta as que estão, tudo em uma única operação.
        set: tags.map((tagId: string) => ({ id: tagId })),
      };
    }

    const isMovingCard =
      columnId && currentTodo.columnId && currentTodo.columnId !== columnId;

    if (isMovingCard) {
      // ... (sua lógica de permissão de movimento de card permanece a mesma)
    }

    const updatedTodo = await prisma.todo.update({
      where: { id: id },
      data: dataForPrismaUpdate,
      include: {
        // --- CORREÇÃO NO INCLUDE ---
        // Adicionado 'tags: true' para garantir que o objeto retornado tenha as tags atualizadas.
        tags: true,
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
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 });
    }
    console.error("Error updating todo:", error);
    logger.error({ error }, "Error updating todo:");
    return new Response("Internal Server Error", { status: 500 });
  }
}
