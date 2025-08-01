// Path: kanban-interno/src/app/api/projects/route.ts
import { getAuthSession } from "@/lib/nextAuthOptions";
import { getLogger } from "@/logger";
import prisma from "@/lib/prismadb";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    // Verificação de segurança para garantir que a sessão e o email do usuário existem
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Assumindo que você configurou next-auth.d.ts para incluir 'role'
    const userRole = session.user.role;

    // Se o usuário for ADMIN, retorna todos os projetos
    if (userRole === "ADMIN") {
      const projects = await prisma.project.findMany({
        orderBy: {
          name: "asc", // Ordenar por nome é geralmente mais útil
        },
      });
      return new Response(JSON.stringify(projects), { status: 200 });
    }

    // Lógica corrigida para usuários não-administradores
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        areas: { // Inclui os dados completos das áreas do usuário
          select: {
            name: true // Seleciona apenas o nome de cada área
          }
        }
      }
    });

    // Se o usuário for encontrado e pertencer a alguma área
    if (user && user.areas.length > 0) {
      // Extrai os nomes das áreas do usuário para um array
      const userAreaNames = user.areas.map(area => area.name);

      // Busca projetos cujos nomes correspondem aos nomes das áreas do usuário
      const projects = await prisma.project.findMany({
        where: {
          name: { in: userAreaNames },
        },
        orderBy: {
          name: "asc",
        },
      });
      return new Response(JSON.stringify(projects), { status: 200 });
    }

    // Se o usuário não for admin e não tiver áreas, retorna uma lista vazia
    return new Response(JSON.stringify([]), { status: 200 });
  } catch (error) {
    logger.error("Error fetching projects:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// POST /api/projects - Cria um novo projeto
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
    logger.error("Error creating project:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// PUT /api/projects - Atualiza um projeto existente
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
        name: name || undefined,
        description: description || undefined,
      },
    });

    return new Response(JSON.stringify(updatedProject), { status: 200 });
  } catch (error) {
    logger.error("Error updating project:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// DELETE /api/projects - Deleta um projeto
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

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return new Response("Project ID is required", { status: 400 });
    }

    const deletedProject = await prisma.project.delete({
      where: { id: id },
    });

    return new Response(JSON.stringify(deletedProject), { status: 200 });
  } catch (error) {
    logger.error("Error deleting project:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
