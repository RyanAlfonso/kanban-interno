import { getAuthSession } from "@/lib/nextAuthOptions";
import { getLogger } from "@/logger";
import prisma from "@/lib/prismadb";
import { NextRequest } from 'next/server';

// GET /api/projects - List all projects
export async function GET(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const projects = await prisma.project.findMany({
      orderBy: {
        createdAt: "asc", // Or order by name: name: "asc"
      },
    });

    return new Response(JSON.stringify(projects), { status: 200 });
  } catch (error) {
    logger.error("Error fetching projects:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

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

    return new Response(JSON.stringify(newProject), { status: 201 }); // 201 Created
  } catch (error) {
    logger.error("Error creating project:", error);
    // Handle potential unique constraint errors if needed
    return new Response("Internal Server Error", { status: 500 });
  }
}



// PUT /api/projects - Update an existing project
export async function PUT(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const { id, name, description } = body;

    if (!id) {
      return new Response("Project ID is required", { status: 400 });
    }

    const updatedProject = await prisma.project.update({
      where: { id: id },
      data: {
        name: name || undefined,
        description: description || null,
      },
    });

    return new Response(JSON.stringify(updatedProject), { status: 200 });
  } catch (error) {
    logger.error("Error updating project:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// DELETE /api/projects - Delete a project
export async function DELETE(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return new Response("Project ID is required", { status: 400 });
    }

    // Optionally, handle associated todos (e.g., set projectId to null or delete them)
    // For now, let's just delete the project. Prisma will handle cascading deletes if configured.
    const deletedProject = await prisma.project.delete({
      where: { id: id },
    });

    return new Response(JSON.stringify(deletedProject), { status: 200 });
  } catch (error) {
    logger.error("Error deleting project:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}


