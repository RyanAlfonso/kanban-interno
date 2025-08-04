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

    if (!projectId) {
      return new Response("Project ID is required", { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { areas: true },
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return new Response("Project not found", { status: 404 });
    }

    if (session.user.role !== "ADMIN") {
      const userAreaNames = user.areas.map((area) => area.name);
      if (!userAreaNames.includes(project.name)) {
        return new Response("Forbidden: No access to this project", {
          status: 403,
        });
      }
    }

    const tags = await prisma.tag.findMany({
      where: { projectId },
      orderBy: { name: "asc" },
    });

    return new Response(JSON.stringify(tags), { status: 200 });
  } catch (error) {
    logger.error("Error fetching tags:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { areas: true },
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return new Response("Project not found", { status: 404 });
    }

    if (session.user.role !== "ADMIN") {
      const userAreaNames = user.areas.map((area) => area.name);
      if (!userAreaNames.includes(project.name)) {
        return new Response("Forbidden: No access to this project", {
          status: 403,
        });
      }
    }

    const existingTag = await prisma.tag.findFirst({
      where: {
        name,
        projectId,
      },
    });

    if (existingTag) {
      return new Response("Tag with this name already exists in this project", {
        status: 409,
      });
    }

    const newTag = await prisma.tag.create({
      data: {
        name,
        color: color || "#3B82F6",
        projectId,
      },
    });

    return new Response(JSON.stringify(newTag), { status: 201 });
  } catch (error) {
    logger.error("Error creating tag:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

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

    const existingTag = await prisma.tag.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existingTag) {
      return new Response("Tag not found", { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { areas: true },
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    if (session.user.role !== "ADMIN") {
      const userAreaNames = user.areas.map((area) => area.name);
      if (!userAreaNames.includes(existingTag.project.name)) {
        return new Response("Forbidden: No access to this project", {
          status: 403,
        });
      }
    }

    if (name && name !== existingTag.name) {
      const duplicateTag = await prisma.tag.findFirst({
        where: {
          name,
          projectId: existingTag.projectId,
          id: { not: id },
        },
      });

      if (duplicateTag) {
        return new Response(
          "Tag with this name already exists in this project",
          { status: 409 }
        );
      }
    }

    const updatedTag = await prisma.tag.update({
      where: { id },
      data: {
        name: name || undefined,
        color: color || undefined,
      },
    });

    return new Response(JSON.stringify(updatedTag), { status: 200 });
  } catch (error) {
    logger.error("Error updating tag:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

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

    const existingTag = await prisma.tag.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existingTag) {
      return new Response("Tag not found", { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { areas: true },
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    if (session.user.role !== "ADMIN") {
      const userAreaNames = user.areas.map((area) => area.name);
      if (!userAreaNames.includes(existingTag.project.name)) {
        return new Response("Forbidden: No access to this project", {
          status: 403,
        });
      }
    }

    const deletedTag = await prisma.tag.delete({
      where: { id },
    });

    return new Response(JSON.stringify(deletedTag), { status: 200 });
  } catch (error) {
    logger.error("Error deleting tag:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
