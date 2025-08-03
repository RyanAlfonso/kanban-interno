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
    const view = searchParams.get("view");
    
    // Parâmetros de paginação (opcional, mas bom ter)
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Buscar usuário e suas áreas para verificação de permissão
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

      // Se não for admin, verificar se o usuário tem acesso ao projeto
      if (session.user.role !== "ADMIN") {
        const userAreaNames = user.areas?.map(area => area.name) ?? [];
        if (!userAreaNames.includes(project.name)) {
          return new Response("Forbidden: No access to this project", { status: 403 });
        }
      }

      whereClause.projectId = projectId;
    } else if (session.user.role !== "ADMIN") {
      // Se não for admin e não especificou um projeto, filtrar por projetos que ele tem acesso
      const userAreaNames = user.areas?.map(area => area.name) ?? [];
      
      if (userAreaNames.length > 0) {
        const accessibleProjects = await prisma.project.findMany({
          where: { name: { in: userAreaNames } },
          select: { id: true }
        });
        const accessibleProjectIds = accessibleProjects.map(p => p.id);
        whereClause.projectId = { in: accessibleProjectIds };
      } else {
        // Se o usuário não tem acesso a nenhuma área, retorna um array vazio
        return new Response(JSON.stringify({ todos: [], total: 0, page, limit, totalPages: 0 }), { status: 200 });
      }
    }

    // Filtro por view (mine = apenas tarefas do próprio usuário)
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
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999); // Inclui todo o dia final
        whereClause.deadline.lte = endDateTime;
      }
    }

    // Buscar total de registros para paginação
    const total = await prisma.todo.count({ where: whereClause });

    // Buscar todos com filtros e paginação aplicados
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
        // Outros includes podem ser adicionados aqui conforme necessário
      },
    });

    // Adicionar relações que não podem ser incluídas diretamente na query principal (ex: assignedTo)
    const todosWithRelations = await Promise.all(
      todos.map(async (todo) => {
        const assignedUsers = await prisma.user.findMany({
          where: { id: { in: todo.assignedToIds } },
          select: { id: true, name: true, email: true, image: true },
        });
        return { 
          ...todo, 
          assignedTo: assignedUsers, 
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
    logger.error("Error in /api/todo/filter GET:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ message: "Internal Server Error", error: errorMessage }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}

// A rota POST pode ser usada para filtros mais complexos que não cabem em uma URL.
// A lógica é muito similar à da rota GET.
export async function POST(req: NextRequest) {
    // Implemente a lógica POST aqui se necessário, seguindo o padrão da rota GET.
    return new Response(JSON.stringify({ message: "POST method for filtering is not implemented." }), { status: 405 });
}
