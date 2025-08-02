// Path: kanban-interno/src/app/api/tags/route.ts
import { getAuthSession } from "@/lib/nextAuthOptions";
import { getLogger } from "@/logger";
import prisma from "@/lib/prismadb";
import { NextRequest } from "next/server";

// GET /api/tags?projectId=xxx - Busca todas as tags de um projeto
export async function GET(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return new Response("Project ID is required", { status: 400 });
    }

    // Verificar se o usuário tem acesso ao projeto
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { areas: true }
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    // Verificar se o projeto existe e se o usuário tem acesso
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

    const tags = await prisma.tag.findMany({
      where: { projectId },
      orderBy: { name: "asc" }
    });

    return new Response(JSON.stringify(tags), { status: 200 });
  } catch (error) {
    logger.error("Error fetching tags:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// POST /api/tags - Cria uma nova tag
export async function POST(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, color, projectId } = body;

    if (!name || !projectId) {
      return new Response("Name and Project ID are required", { status: 400 });
    }

    // Verificar se o usuário tem acesso ao projeto
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { areas: true }
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

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

    // Verificar se já existe uma tag com o mesmo nome no projeto
    const existingTag = await prisma.tag.findFirst({
      where: {
        name,
        projectId
      }
    });

    if (existingTag) {
      return new Response("Tag with this name already exists in this project", { status: 409 });
    }

    const newTag = await prisma.tag.create({
      data: {
        name,
        color: color || "#3B82F6",
        projectId
      }
    });

    return new Response(JSON.stringify(newTag), { status: 201 });
  } catch (error) {
    logger.error("Error creating tag:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// PUT /api/tags - Atualiza uma tag existente
export async function PUT(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { id, name, color } = body;

    if (!id) {
      return new Response("Tag ID is required", { status: 400 });
    }

    // Buscar a tag existente
    const existingTag = await prisma.tag.findUnique({
      where: { id },
      include: { project: true }
    });

    if (!existingTag) {
      return new Response("Tag not found", { status: 404 });
    }

    // Verificar se o usuário tem acesso ao projeto
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { areas: true }
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    // Se não for admin, verificar se tem acesso ao projeto
    if (session.user.role !== "ADMIN") {
      const userAreaNames = user.areas.map(area => area.name);
      if (!userAreaNames.includes(existingTag.project.name)) {
        return new Response("Forbidden: No access to this project", { status: 403 });
      }
    }

    // Se o nome está sendo alterado, verificar se não existe outra tag com o mesmo nome
    if (name && name !== existingTag.name) {
      const duplicateTag = await prisma.tag.findFirst({
        where: {
          name,
          projectId: existingTag.projectId,
          id: { not: id }
        }
      });

      if (duplicateTag) {
        return new Response("Tag with this name already exists in this project", { status: 409 });
      }
    }

    const updatedTag = await prisma.tag.update({
      where: { id },
      data: {
        name: name || undefined,
        color: color || undefined
      }
    });

    return new Response(JSON.stringify(updatedTag), { status: 200 });
  } catch (error) {
    logger.error("Error updating tag:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// DELETE /api/tags - Deleta uma tag
export async function DELETE(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return new Response("Tag ID is required", { status: 400 });
    }

    // Buscar a tag existente
    const existingTag = await prisma.tag.findUnique({
      where: { id },
      include: { project: true }
    });

    if (!existingTag) {
      return new Response("Tag not found", { status: 404 });
    }

    // Verificar se o usuário tem acesso ao projeto
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { areas: true }
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    // Se não for admin, verificar se tem acesso ao projeto
    if (session.user.role !== "ADMIN") {
      const userAreaNames = user.areas.map(area => area.name);
      if (!userAreaNames.includes(existingTag.project.name)) {
        return new Response("Forbidden: No access to this project", { status: 403 });
      }
    }

    const deletedTag = await prisma.tag.delete({
      where: { id }
    });

    return new Response(JSON.stringify(deletedTag), { status: 200 });
  } catch (error) {
    logger.error("Error deleting tag:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}