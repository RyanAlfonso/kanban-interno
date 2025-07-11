import { getAuthSession } from "@/lib/nextAuthOptions";
import prisma from "@/lib/prismadb";
import { getLogger } from "@/logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { todoId: string } },
) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { todoId } = params;

    if (!todoId) {
      return new NextResponse("Todo ID is required", { status: 400 });
    }

    // Validate user owns the todo or has rights to view its history
    // For simplicity, we'll check if the user owns the parent todo.
    // More complex permission models might be needed in a real app.
    const todo = await prisma.todo.findUnique({
      where: { id: todoId },
      select: { ownerId: true },
    });

    if (!todo) {
      return new NextResponse("Todo not found", { status: 404 });
    }

    if (todo.ownerId !== session.user.id) {
      // Basic ownership check. Admins or project members might have different rules.
      return new NextResponse("Forbidden", { status: 403 });
    }

    const historyEntries = await prisma.todoHistory.findMany({
      where: {
        todoId: todoId,
      },
      include: {
        user: {
          select: { name: true, email: true }, // Select only necessary user fields
        },
        fromColumn: {
          select: { name: true }, // Select only necessary column fields
        },
        toColumn: {
          select: { name: true }, // Select only necessary column fields
        },
      },
      orderBy: {
        changedAt: "desc", // Show newest history first
      },
    });

    logger.info(`--- Backend API (GET /api/todo/${todoId}/history): Fetched ${historyEntries.length} history entries ---`);
    return NextResponse.json(historyEntries, { status: 200 });

  } catch (error) {
    logger.error(`--- Backend API (GET /api/todo/[todoId]/history): Error ---`, error);
    if (error.code && error.meta) { // Check if it's likely a PrismaKnownRequestError
      logger.error(`--- Backend API (GET /api/todo/[todoId]/history): Prisma Error Code: ${error.code}, Meta: ${JSON.stringify(error.meta)} ---`);
      if (error.code === 'P2025') {
        logger.error("--- Backend API (GET /api/todo/[todoId]/history): This is a Prisma P2025 error. It means a required related record was not found. Please check data integrity, e.g., orphaned TodoHistory records pointing to deleted Users or Columns if relations are mandatory. ---");
      }
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
