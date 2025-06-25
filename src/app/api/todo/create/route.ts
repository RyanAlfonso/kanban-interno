
import { getAuthSession } from "@/lib/nextAuthOptions";
import prisma from "@/lib/prismadb";
import { TodoCreateValidator } from "@/lib/validators/todo";
import { getLogger } from "@/logger";
import { z } from "zod"; // Import Zod

export async function POST(req) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();

    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();

    // Include projectId in the validation and parsing
    const {
      title,
      description = "",
      state,
      deadline,
      label,
      projectId, // Parse projectId
    } = TodoCreateValidator.parse(body);

    const todoWithMaxOrderInSameState = await prisma.todo.findFirst({
      where: {
        // Filter by projectId if provided, otherwise consider only non-project tasks?
        // For now, let's assume order is per-project if projectId exists, otherwise global
        projectId: projectId ?? null, 
        ownerId: session.user.id,
        state,
        isDeleted: false,
      },
      orderBy: {
        order: "desc",
      },
    });
    const order = !todoWithMaxOrderInSameState
      ? 1
      : todoWithMaxOrderInSameState.order + 1;

    // Prepare data for creation, including projectId if it exists
    const createData: any = {
      title,
      description,
      state,
      label,
      deadline,
      order,
      owner: {
        connect: {
          id: session.user.id,
        },
      },
    };

    // Conditionally connect to project if projectId is provided
    if (projectId) {
      createData.project = {
        connect: {
          id: projectId,
        },
      };
    }

    const result = await prisma.todo.create({
      data: createData,
      // Include project in the response to update cache correctly
      include: {
        project: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, image: true } }
      }
    });

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    logger.error(error);
    // Handle Zod validation errors specifically
    if (error instanceof z.ZodError) {
        return new Response(JSON.stringify(error.issues), { status: 400 });
    }
    return new Response("Internal Server Error", { status: 500 });
  }
}

