import { getAuthSession } from "@/lib/nextAuthOptions";
import { getLogger } from "@/logger";
import prisma from "@/lib/prismadb";
import { NextRequest } from "next/server";
import { PRIORITY_TAG_COLOR } from "@/lib/tagColors";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const projectId = params.id;

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

    // Verificar se a tag Prioridade já existe
    const existingPriorityTag = await prisma.tag.findFirst({
      where: {
        name: "Prioridade",
        projectId,
      },
    });

    if (existingPriorityTag) {
      return new Response("Priority tag already exists for this project", { status: 409 });
    }

    // Criar a tag Prioridade
    const priorityTag = await prisma.tag.create({
      data: {
        name: "Prioridade",
        color: PRIORITY_TAG_COLOR,
        projectId,
      },
    });

    return new Response(JSON.stringify(priorityTag), { status: 201 });
  } catch (error) {
    logger.error("Error creating priority tag:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

