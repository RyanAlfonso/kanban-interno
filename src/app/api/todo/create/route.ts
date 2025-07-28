// Path: kanban-interno/src/app/api/todo/create/route.ts
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

    // Include columnId and projectId in the validation and parsing
    const {
      title,
      description = "",
      columnId, // Use columnId
      deadline,
      label,
      tags,
      projectId, // projectId of the parent Project (optional, but column implies a project)
      assignedToIds, // Added assignedToIds
      parentId, // Added parentId
      linkedCardIds, // Added linkedCardIds
    } = TodoCreateValidator.parse(body);

    // Fetch the project column to validate its existence and get its actual projectId
    const projectColumn = await prisma.projectColumn.findUnique({
      where: { id: columnId },
      select: { projectId: true }
    });

    if (!projectColumn) {
      return new Response("Project column not found", { status: 404 });
    }

    // If projectId was also sent in payload, ensure it matches the column\"s project
    if (projectId && projectId !== projectColumn.projectId) {
        return new Response("Mismatch between provided projectId and column\"s actual project", { status: 400 });
    }

    // Use the column\"s actual projectId for consistency
    const actualProjectId = projectColumn.projectId;

    const todoWithMaxOrderInColumn = await prisma.todo.findFirst({
      where: {
        // Order is per column
        columnId: columnId,
        // ownerId: session.user.id, // Order might be global within column, or per user. Assuming global for now.
        isDeleted: false,
      },
      orderBy: {
        order: "desc",
      },
    });
    const order = !todoWithMaxOrderInColumn
      ? 1 // Start order at 1 (or 0, depending on preference)
      : todoWithMaxOrderInColumn.order + 1;

    // Prepare data for creation
    const createData: any = {
      title,
      description,
      column: { // Connect to the ProjectColumn
        connect: {
          id: columnId,
        },
      },
      project: { // Connect to the Project derived from the ProjectColumn
        connect: {
            id: actualProjectId,
        }
      },
      label,
      tags,
      deadline,
      order,
      owner: {
        connect: {
          id: session.user.id,
        },
      },
      assignedToIds, // Added assignedToIds
      linkedCardIds, // Added linkedCardIds
    };

    // Handle parent connection if parentId is provided
    if (parentId) {
      createData.parent = {
        connect: {
          id: parentId,
        },
      };
    }

    // Note: projectId is now implicitly set by connecting to the ProjectColumn\"s project.
    // If you still want to allow setting a projectId on Todo that differs from its column\"s project
    // (which would be unusual), that logic would need to be more complex.
    // Current setup ensures Todo.projectId matches its Column\"s Project.

    const result = await prisma.todo.create({
      data: createData,
      include: { // Include relations in the response
        project: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, image: true } },
        column: { select: { id: true, name: true, order: true, projectId: true }},
        movementHistory: { // Include movement history
          include: {
            movedBy: { select: { id: true, name: true } },
            fromColumn: { select: { id: true, name: true } },
            toColumn: { select: { id: true, name: true } },
          },
          orderBy: { movedAt: "asc" },
        },
        parent: { select: { id: true, title: true } }, // Include parent
        childTodos: { select: { id: true, title: true } }, // Include childTodos
        // linkedCards: { select: { id: true, title: true } }, // Include linkedCards (if needed for display)
      }
    });

    // Fetch assigned users separately since we can\"t use direct relation
    const assignedUsers = await prisma.user.findMany({
      where: {
        id: { in: result.assignedToIds },
      },
      select: { id: true, name: true, email: true, image: true },
    });

    const resultWithAssignedUsers = {
      ...result,
      assignedTo: assignedUsers,
    };

    return new Response(JSON.stringify(resultWithAssignedUsers), { status: 200 });
  } catch (error) {
    logger.error(error);
    // Handle Zod validation errors specifically
    if (error instanceof z.ZodError) {
        return new Response(JSON.stringify(error.issues), { status: 400 });
    }
    return new Response("Internal Server Error", { status: 500 });
  }
}