import { getAuthSession } from "@/lib/nextAuthOptions";
import { getLogger } from "@/logger";
import prisma from "@/lib/prismadb";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();

    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    
    const projectId = searchParams.get("projectId");
    const tagIds = searchParams.get("tagIds")?.split(",").filter(Boolean) || [];
    const assignedToIds = searchParams.get("assignedToIds")?.split(",").filter(Boolean) || [];
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const view = searchParams.get("view");
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

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

    if (projectId && projectId !== "all") {
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return new Response("Project not found", { status: 404 });
      }

      if (session.user.role !== "ADMIN") {
        const userAreaNames = user.areas?.map(area => area.name) ?? [];
        if (!userAreaNames.includes(project.name)) {
          return new Response("Forbidden: No access to this project", { status: 403 });
        }
      }

      whereClause.projectId = projectId;
    } else if (session.user.role !== "ADMIN") {
      const userAreaNames = user.areas?.map(area => area.name) ?? [];
      
      if (userAreaNames.length > 0) {
        const accessibleProjects = await prisma.project.findMany({
          where: { name: { in: userAreaNames } },
          select: { id: true }
        });
        const accessibleProjectIds = accessibleProjects.map(p => p.id);
        whereClause.projectId = { in: accessibleProjectIds };
      } else {
        return new Response(JSON.stringify({ todos: [], total: 0, page, limit, totalPages: 0 }), { status: 200 });
      }
    }

    if (view === "mine") {
      whereClause.ownerId = session.user.id;
    }

    if (tagIds.length > 0) {
      whereClause.tags = {
        some: {
          id: { in: tagIds }
        }
      };
    }

    if (assignedToIds.length > 0) {
      whereClause.assignedToIds = {
        hasSome: assignedToIds
      };
    }

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

    const total = await prisma.todo.count({ where: whereClause });

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
      },
    });

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

export async function POST(req: NextRequest) {
    return new Response(JSON.stringify({ message: "POST method for filtering is not implemented." }), { status: 405 });
}
