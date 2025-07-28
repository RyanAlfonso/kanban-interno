// Path: kanban-interno/src/app/api/todo/route.ts
import { getAuthSession } from "@/lib/nextAuthOptions";
import { getLogger } from "@/logger";
import prisma from "@/lib/prismadb";
import { NextRequest } from "next/server";
import { isValidTag, PREDEFINED_TAGS } from "@/lib/tags";
import { canMoveCard } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();

    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const url = new URL(req.url);
    const view = url.searchParams.get("view");
    const projectId = url.searchParams.get("projectId"); // Get projectId from query params

    let whereClause: any = {
      isDeleted: false,
    };

    // Conditionally add ownerId filter if view=mine is requested
    if (view === "mine") {
      whereClause.ownerId = session.user.id;
    }

    // Conditionally add projectId filter if provided
    // If projectId is 'all' or null/undefined, don't filter by project
    if (projectId && projectId !== "all") {
        whereClause.projectId = projectId;
    } else if (!projectId) {
        // Default behavior if no projectId is specified: maybe fetch only todos without a project?
        // Or fetch all? For now, let's fetch all if no specific project is requested.
        // If you want to fetch ONLY unassigned todos by default, use: whereClause.projectId = null;
    }

    const todos = await prisma.todo.findMany({
      where: whereClause,
      orderBy: {
        order: "asc",
      },
      include: {
        owner: {
          select: { id: true, name: true, image: true }
        },
        project: {
          select: { id: true, name: true } // Include project info
        },
        column: { // Include column information
            select: { id: true, name: true, order: true }
        },
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
      }
    });

    // Fetch assigned users and linked cards separately since we can't use direct relation
    const todosWithRelations = await Promise.all(
      todos.map(async (todo) => {
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

        return {
          ...todo,
          assignedTo: assignedUsers,
          linkedCards: linkedCards,
        };
      })
    );

    return new Response(JSON.stringify(todosWithRelations), { status: 200 });
  } catch (error) {
    logger.error("Error fetching todos:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}



export async function POST(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const { title, description, columnId, label, tags, deadline, projectId, order, assignedToIds, parentId, linkedCardIds } = body;

    if (!title || !columnId || order === undefined) {
      return new Response("Missing required fields: title, columnId, order", { status: 400 });
    }

    if (!assignedToIds || !Array.isArray(assignedToIds) || assignedToIds.length === 0) {
      return new Response("Missing required field: assignedToIds (must be a non-empty array)", { status: 400 });
    }

    if (!deadline) {
      return new Response("Missing required field: deadline", { status: 400 });
    }

    const parsedDeadline = new Date(deadline);
    if (isNaN(parsedDeadline.getTime())) {
      return new Response("Invalid deadline format. Must be a valid date.", { status: 400 });
    }

    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        if (!isValidTag(tag)) {
          return new Response(`Invalid tag: ${tag}. Allowed tags are: ${PREDEFINED_TAGS.join(", ")}`, { status: 400 });
        }
      }
    } else if (tags) {
      return new Response("Tags must be an array of strings.", { status: 400 });
    }

    if (columnId && projectId) {
      const column = await prisma.projectColumn.findUnique({
        where: { id: columnId },
        select: { projectId: true }
      });
      if (!column || column.projectId !== projectId) {
        return new Response("Column does not belong to the specified project", { status: 400 });
      }
    }

    const validUsers = await prisma.user.findMany({
      where: { id: { in: assignedToIds } },
      select: { id: true }
    });

    if (validUsers.length !== assignedToIds.length) {
      return new Response("One or more assigned user IDs are invalid", { status: 400 });
    }

    const newTodo = await prisma.todo.create({
      data: {
        title,
        description: description || null,
        columnId,
        label: label || [],
        tags: tags || [],
        deadline: parsedDeadline,
        projectId: projectId || null,
        order,
        ownerId: session.user.id,
        assignedToIds: assignedToIds || [], // Add assignedToIds
        parentId: parentId || null, // Add parentId
        linkedCardIds: linkedCardIds || [], // Add linkedCardIds
      },
    });

    return new Response(JSON.stringify(newTodo), { status: 201 });
  } catch (error) {
    logger.error("Error creating todo:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}




// PUT /api/todo - Update an existing todo
export async function PUT(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    // Destructure columnId, remove state, add tags
    const { id, title, description, columnId, label, tags, deadline, projectId, order, isDeleted, assignedToIds, parentId, linkedCardIds } = body;

    // SERVER-SIDE LOGGING START
    const loggerForContext = getLogger("info"); // Use your existing logger or console.log
    loggerForContext.info("--- Backend API (PUT): Received request body ---", JSON.stringify(body, null, 2));
    loggerForContext.info("--- Backend API (PUT): Tags received in body ---", JSON.stringify(tags, null, 2));
    // SERVER-SIDE LOGGING END

    if (!id) {
      return new Response("Todo ID is required", { status: 400 });
    }

    // Validate tags if provided
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        if (!isValidTag(tag)) {
          return new Response(`Invalid tag: ${tag}. Allowed tags are: ${PREDEFINED_TAGS.join(", ")}`, { status: 400 });
        }
      }
    } else if (tags && tags !== undefined) { // Allow tags to be explicitly set to empty array, but not other non-array types
      return new Response("Tags must be an array of strings.", { status: 400 });
    }

    // Optional: Validate that the columnId belongs to the projectId if both are provided
    // and columnId is being changed.
    if (columnId && projectId) {
        const currentTodo = await prisma.todo.findUnique({ where: {id}});
        if (currentTodo && currentTodo.columnId !== columnId) { // if columnId is actually changing
            const column = await prisma.projectColumn.findUnique({
                where: { id: columnId },
                select: { projectId: true }
            });
            if (!column || column.projectId !== projectId) {
                return new Response("New column does not belong to the specified project", { status: 400 });
            };
        };
    };

    // Handle card movement history and permissions
    const currentTodo = await prisma.todo.findUnique({ 
      where: { id },
      include: {
        column: { select: { name: true } }
      }
    });
    
    if (currentTodo && columnId && currentTodo.columnId !== columnId) {
      // Get user data with type
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { type: true }
      });

      if (!user) {
        return new Response("User not found", { status: 404 });
      }

      // Get column names for permission check
      const fromColumn = currentTodo.column;
      const toColumn = await prisma.projectColumn.findUnique({
        where: { id: columnId },
        select: { name: true }
      });

      if (!fromColumn || !toColumn) {
        return new Response("Column not found", { status: 404 });
      }

      // Check if movement is allowed
      const permissionCheck = canMoveCard(fromColumn.name, toColumn.name, user.type);
      
      if (!permissionCheck.allowed) {
        return new Response(permissionCheck.error || "Movement not allowed", { status: 403 });
      }

      await prisma.cardMovementHistory.create({
        data: {
          todoId: id,
          movedById: session.user.id,
          fromColumnId: currentTodo.columnId,
          toColumnId: columnId,
        },
      });
    };

    // SERVER-SIDE LOGGING START
    const dataForPrismaUpdate = {
      title: title || undefined,
      description: description || null,
      columnId: columnId || undefined,
      label: label || undefined,
      tags: tags !== undefined ? tags : undefined,
      deadline: deadline || null,
      projectId: projectId || undefined,
      order: order !== undefined ? order : undefined,
      isDeleted: isDeleted !== undefined ? isDeleted : undefined,
      assignedToIds: assignedToIds !== undefined ? assignedToIds : undefined, // Add assignedToIds
      parentId: parentId !== undefined ? parentId : undefined, // Add parentId
      linkedCardIds: linkedCardIds !== undefined ? linkedCardIds : undefined, // Add linkedCardIds
    };
    loggerForContext.info("--- Backend API (PUT): Data being sent to Prisma update ---", JSON.stringify(dataForPrismaUpdate, null, 2));
    // SERVER-SIDE LOGGING END

    const updatedTodo = await prisma.todo.update({
      where: { id: id },
      data: dataForPrismaUpdate, // Use the constructed object
      include: {
        project: true,
        column: true,
        owner: true,
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
      }
    });

    // Fetch assigned users and linked cards separately since we can't use direct relation
    const assignedUsers = await prisma.user.findMany({
      where: {
        id: { in: updatedTodo.assignedToIds },
      },
      select: { id: true, name: true, email: true, image: true },
    });

    const linkedCards = await prisma.todo.findMany({
      where: {
        id: { in: updatedTodo.linkedCardIds },
      },
      select: { id: true, title: true },
    });

    const resultWithRelations = {
      ...updatedTodo,
      assignedTo: assignedUsers,
      linkedCards: linkedCards,
    };

    // SERVER-SIDE LOGGING START
    loggerForContext.info("--- Backend API (PUT): Todo returned from Prisma update ---", JSON.stringify(resultWithRelations, null, 2));
    // SERVER-SIDE LOGGING END

    if (!updatedTodo) {
      logger.error(`--- Backend API (PUT): Failed to fetch updated todo with id: ${record.id} after update operation.`);
      return new Response("Failed to retrieve updated record after update.", { status: 500 });
    }

    return new Response(JSON.stringify(resultWithRelations), { status: 200 });
  } catch (error) {
    // SERVER-SIDE LOGGING START
    const loggerForCatch = getLogger("error"); // Use your existing logger or console.error
    loggerForCatch.error("--- Backend API (PUT): Error during Prisma update ---", error);
    // SERVER-SIDE LOGGING END
    logger.error("Error updating todo:", error); // Keep original error logging too
    return new Response("Internal Server Error", { status: 500 });
  }
}

// DELETE /api/todo - Delete a todo
export async function DELETE(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return new Response("Todo ID is required", { status: 400 });
    }

    const deletedTodo = await prisma.todo.delete({
      where: { id: id },
    });

    return new Response(JSON.stringify(deletedTodo), { status: 200 });
  } catch (error) {
    logger.error("Error deleting todo:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

