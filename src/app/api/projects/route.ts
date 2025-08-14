// File: kanban-interno/src/app/api/projects/route.ts

import { getAuthSession } from "@/lib/nextAuthOptions";
import prisma from "@/lib/prismadb";
import { getLogger } from "@/logger";
import { NextRequest } from "next/server";

/**
 * GET /api/projects
 * Busca projetos com base na role do usuário.
 * - ADMINs veem todos os projetos.
 * - Usuários comuns veem apenas os projetos aos quais estão associados através de suas áreas.
 */
export async function GET(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userRole = session.user.role;

    // Se o usuário for ADMIN, retorna todos os projetos
    if (userRole === "ADMIN") {
      const projects = await prisma.project.findMany({
        orderBy: {
          name: "asc",
        },
      });
      return new Response(JSON.stringify(projects), { status: 200 });
    }

    // Para usuários não-ADMIN, busca os IDs das áreas associadas
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        areaIds: true, // Seleciona apenas os IDs das áreas para eficiência
      },
    });

    // Se o usuário for encontrado e tiver áreas, filtra os projetos pelo ID
    if (user && user.areaIds.length > 0) {
      const projects = await prisma.project.findMany({
        where: {
          id: { in: user.areaIds }, // Filtra projetos cujo ID está na lista de areaIds do usuário
        },
        orderBy: {
          name: "asc",
        },
      });
      return new Response(JSON.stringify(projects), { status: 200 });
    }

    // Se o usuário não for ADMIN e não tiver áreas, retorna uma lista vazia
    return new Response(JSON.stringify([]), { status: 200 });
  } catch (error) {
    logger.error(error, "Error fetching projects:");
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * POST /api/projects
 * Cria um novo projeto. Apenas para ADMINs.
 */
export async function POST(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new Response("Forbidden: User is not an Admin", { status: 403 });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return new Response("Project name is required", { status: 400 });
    }

    const newProject = await prisma.project.create({
      data: {
        name,
        description: description || null,
      },
    });

    return new Response(JSON.stringify(newProject), { status: 201 });
  } catch (error) {
    logger.error(error, "Error creating project:");
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * PUT /api/projects
 * Atualiza um projeto existente. Apenas para ADMINs.
 */
export async function PUT(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new Response("Forbidden: User is not an Admin", { status: 403 });
    }

    const body = await req.json();
    const { id, name, description } = body;

    if (!id) {
      return new Response("Project ID is required", { status: 400 });
    }

    const updatedProject = await prisma.project.update({
      where: { id: id },
      data: {
        name: name,
        description: description,
      },
    });

    return new Response(JSON.stringify(updatedProject), { status: 200 });
  } catch (error) {
    logger.error(error, "Error updating project:");
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * DELETE /api/projects
 * Deleta um projeto. Apenas para ADMINs.
 */
export async function DELETE(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return new Response("Forbidden: User is not an Admin", { status: 403 });
    }

    const { id } = await req.json();

    if (!id) {
      return new Response("Project ID is required", { status: 400 });
    }

    const deletedProject = await prisma.project.delete({
      where: { id: id },
    });

    return new Response(JSON.stringify(deletedProject), { status: 200 });
  } catch (error) {
    logger.error(error, "Error deleting project:");
    return new Response("Internal Server Error", { status: 500 });
  }
}
