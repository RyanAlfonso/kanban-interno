// Path: kanban-interno/src/app/api/todo/filter/route.ts
import { getAuthSession } from "@/lib/nextAuthOptions";
import { getLogger } from "@/logger";
import prisma from "@/lib/prismadb";
import { NextRequest } from "next/server";

// GET /api/todo/filter - Busca todos com filtros avançados
export async function GET(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();

    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    
    // Parâmetros de filtro
    const projectId = searchParams.get("projectId");
    const tagIds = searchParams.get("tagIds")?.split(",").filter(Boolean) || [];
    const assignedToIds = searchParams.get("assignedToIds")?.split(",").filter(Boolean) || [];
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const view = searchParams.get("view"); // "mine" | "all"
    
    // Parâmetros de paginação
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Verificar acesso ao projeto
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { areas: true }
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    let whereClause: any = {
      isDeleted: false,
    };

    // Filtro por projeto
    if (projectId && projectId !== "all") {
      // Verificar se o usuário tem acesso ao projeto
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return new Response("Project not found", { status: 404 });
      }

      // Se não for admin, verificar se tem acesso ao projeto
      if (session.user.role !== "ADMIN") {
        const userAreaNames = user.areas.map(area => area.name);
        if (!userAreaNames.includes(project.name)) {
          return new Response("Forbidden: No access to this project", { status: 403 });
        }
      }

      whereClause.projectId = projectId;
    } else if (session.user.role !== "ADMIN") {
      // Se não for admin e não especificou projeto, filtrar por projetos acessíveis
      const userAreaNames = user.areas.map(area => area.name);
      const accessibleProjects = await prisma.project.findMany({
        where: { name: { in: userAreaNames } },
        select: { id: true }
      });
      
      if (accessibleProjects.length > 0) {
        whereClause.projectId = { in: accessibleProjects.map(p => p.id) };
      } else {
        // Se não tem acesso a nenhum projeto, retornar vazio
        return new Response(JSON.stringify({ todos: [], total: 0, page, limit }), { status: 200 });
      }
    }

    // Filtro por view (mine = apenas todos do usuário)
    if (view === "mine") {
      whereClause.ownerId = session.user.id;
    }

    // Filtro por tags
    if (tagIds.length > 0) {
      whereClause.tags = {
        some: {
          id: { in: tagIds }
        }
      };
    }

    // Filtro por responsáveis
    if (assignedToIds.length > 0) {
      whereClause.assignedToIds = {
        hasSome: assignedToIds
      };
    }

    // Filtro por período (deadline)
    if (startDate || endDate) {
      whereClause.deadline = {};
      if (startDate) {
        whereClause.deadline.gte = new Date(startDate);
      }
      if (endDate) {
        // Adicionar 23:59:59 ao endDate para incluir todo o dia
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.deadline.lte = endDateTime;
      }
    }

    // Buscar total de registros para paginação
    const total = await prisma.todo.count({ where: whereClause });

    // Buscar todos com filtros aplicados
    const todos = await prisma.todo.findMany({
      where: whereClause,
      orderBy: [
        { deadline: "asc" },
        { order: "asc" }
      ],
      skip,
      take: limit,
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
          orderBy: { movedAt: "desc" },
          take: 5 // Limitar histórico para performance
        },
        parent: { select: { id: true, title: true } },
        childTodos: { select: { id: true, title: true } },
        attachments: {
          select: { id: true, filename: true, url: true },
          orderBy: { createdAt: "desc" },
          take: 3 // Limitar anexos para performance
        },
        comments: {
          include: {
            author: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 3 // Limitar comentários para performance
        },
      },
    });

    // Buscar usuários responsáveis para cada todo
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
        return { 
          ...todo, 
          assignedTo: assignedUsers, 
          linkedCards: linkedCards 
        };
      })
    );

    const response = {
      todos: todosWithRelations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };

    return new Response(JSON.stringify(response), { status: 200 });
  } catch (error) {
    logger.error("Error filtering todos:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// POST /api/todo/filter - Busca todos com filtros complexos via body
export async function POST(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();

    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const {
      projectId,
      tagIds = [],
      assignedToIds = [],
      startDate,
      endDate,
      view,
      page = 1,
      limit = 50,
      sortBy = "deadline", // "deadline" | "createdAt" | "title" | "order"
      sortOrder = "asc", // "asc" | "desc"
      search // Busca por título ou descrição
    } = body;

    // Verificar acesso ao projeto
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { areas: true }
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    let whereClause: any = {
      isDeleted: false,
    };

    // Filtro por projeto
    if (projectId && projectId !== "all") {
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return new Response("Project not found", { status: 404 });
      }

      if (session.user.role !== "ADMIN") {
        const userAreaNames = user.areas.map(area => area.name);
        if (!userAreaNames.includes(project.name)) {
          return new Response("Forbidden: No access to this project", { status: 403 });
        }
      }

      whereClause.projectId = projectId;
    } else if (session.user.role !== "ADMIN") {
      const userAreaNames = user.areas.map(area => area.name);
      const accessibleProjects = await prisma.project.findMany({
        where: { name: { in: userAreaNames } },
        select: { id: true }
      });
      
      if (accessibleProjects.length > 0) {
        whereClause.projectId = { in: accessibleProjects.map(p => p.id) };
      } else {
        return new Response(JSON.stringify({ todos: [], total: 0, page, limit }), { status: 200 });
      }
    }

    // Filtro por view
    if (view === "mine") {
      whereClause.ownerId = session.user.id;
    }

    // Filtro por tags
    if (tagIds.length > 0) {
      whereClause.tags = {
        some: {
          id: { in: tagIds }
        }
      };
    }

    // Filtro por responsáveis
    if (assignedToIds.length > 0) {
      whereClause.assignedToIds = {
        hasSome: assignedToIds
      };
    }

    // Filtro por período
    if (startDate || endDate) {
      whereClause.deadline = {};
      if (startDate) {
        whereClause.deadline.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.deadline.lte = endDateTime;
      }
    }

    // Filtro por busca textual
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ];
    }

    const skip = (page - 1) * limit;
    const total = await prisma.todo.count({ where: whereClause });

    // Definir ordenação
    let orderBy: any = { order: "asc" };
    if (sortBy === "deadline") {
      orderBy = { deadline: sortOrder };
    } else if (sortBy === "createdAt") {
      orderBy = { createdAt: sortOrder };
    } else if (sortBy === "title") {
      orderBy = { title: sortOrder };
    }

    const todos = await prisma.todo.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
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
          orderBy: { movedAt: "desc" },
          take: 5
        },
        parent: { select: { id: true, title: true } },
        childTodos: { select: { id: true, title: true } },
        attachments: {
          select: { id: true, filename: true, url: true },
          orderBy: { createdAt: "desc" },
          take: 3
        },
        comments: {
          include: {
            author: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 3
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
        return { 
          ...todo, 
          assignedTo: assignedUsers, 
          linkedCards: linkedCards 
        };
      })
    );

    const response = {
      todos: todosWithRelations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filters: {
        projectId,
        tagIds,
        assignedToIds,
        startDate,
        endDate,
        view,
        search,
        sortBy,
        sortOrder
      }
    };

    return new Response(JSON.stringify(response), { status: 200 });
  } catch (error) {
    logger.error("Error filtering todos with POST:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}