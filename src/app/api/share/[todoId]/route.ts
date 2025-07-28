// Path: kanban-interno/src/app/api/share/[todoId]/route.ts
import { getAuthSession } from "@/lib/nextAuthOptions";
import { getLogger } from "@/logger";
import prisma from "@/lib/prismadb";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { todoId: string } }
) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const { todoId } = params;

    if (!todoId) {
      return new Response("Todo ID is required", { status: 400 });
    }

    const todo = await prisma.todo.findUnique({
      where: { id: todoId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true }
        },
        project: {
          select: { id: true, name: true }
        },
        column: {
          select: { id: true, name: true }
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, image: true }
            }
          },
          orderBy: { createdAt: "asc" }
        },
        attachments: {
          include: {
            uploadedBy: {
              select: { id: true, name: true, image: true }
            }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!todo) {
      return new Response("Todo not found", { status: 404 });
    }

    if (todo.isDeleted) {
      return new Response("Todo has been deleted", { status: 410 });
    }

    const assignedUsers = await prisma.user.findMany({
      where: {
        id: { in: todo.assignedToIds },
      },
      select: { id: true, name: true, email: true, image: true },
    });

    const linkedCards = await prisma.todo.findMany({
      where: {
        id: { in: todo.linkedCardIds },
      },
      select: { id: true, title: true },
    });

    const todoWithRelations = {
      ...todo,
      assignedTo: assignedUsers,
      linkedCards: linkedCards,
    };

    const shareableLink = `${req.nextUrl.origin}/task/${todoId}`;

    return new Response(JSON.stringify({
      todo: todoWithRelations,
      shareableLink
    }), { 
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    logger.error("Error generating shareable link:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}