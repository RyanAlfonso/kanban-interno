import { getAuthSession } from "@/lib/nextAuthOptions";
import { getLogger } from "@/logger";
import prisma from "@/lib/prismadb";
import { NextRequest } from 'next/server';
import { isValidTag, PREDEFINED_TAGS } from '@/lib/tags';

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
    if (projectId && projectId !== 'all') {
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
        }
        // Add other relations like assignee, labels here when implemented
      }
    });

    return new Response(JSON.stringify(todos), { status: 200 });
  } catch (error) {
    logger.error("Error fetching todos:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}



// POST /api/todo - Create a new todo
export async function POST(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    // Destructure columnId, remove state, add tags
    const { title, description, columnId, label, tags, deadline, projectId, order } = body;

    if (!title || !columnId || order === undefined) {
      return new Response("Missing required fields: title, columnId, order", { status: 400 });
    }

    // Validate tags if provided
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        if (!isValidTag(tag)) {
          return new Response(`Invalid tag: ${tag}. Allowed tags are: ${PREDEFINED_TAGS.join(", ")}`, { status: 400 });
        }
      }
    } else if (tags) {
      return new Response("Tags must be an array of strings.", { status: 400 });
    }

    // Optional: Validate that the columnId belongs to the projectId if both are provided
    if (columnId && projectId) {
      const column = await prisma.projectColumn.findUnique({
        where: { id: columnId },
        select: { projectId: true }
      });
      if (!column || column.projectId !== projectId) {
        return new Response("Column does not belong to the specified project", { status: 400 });
      }
    } else if (columnId && !projectId) {
        // If only columnId is given, we might want to infer projectId from the column
        // For now, this is not strictly enforced here but could be a future enhancement.
        // The schema ensures a column always has a projectId.
    }


    const newTodo = await prisma.todo.create({
      data: {
        title,
        description: description || null,
        columnId, // Use columnId
        label: label || [], // Keep existing label field behavior if necessary
        tags: tags || [], // Add new tags field
        deadline: deadline || null,
        projectId: projectId || null, // projectId can still be set directly if needed, or inferred later
        order,
        ownerId: session.user.id,
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
    const { id, title, description, columnId, label, tags, deadline, projectId, order, isDeleted } = body;

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
            }
        }
    }

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
    };
    loggerForContext.info("--- Backend API (PUT): Data being sent to Prisma update ---", JSON.stringify(dataForPrismaUpdate, null, 2));
    // SERVER-SIDE LOGGING END

    const updatedTodo = await prisma.todo.update({
      where: { id: id },
      data: dataForPrismaUpdate, // Use the constructed object
    });

    // SERVER-SIDE LOGGING START
    loggerForContext.info("--- Backend API (PUT): Todo returned from Prisma update ---", JSON.stringify(updatedTodo, null, 2));
    // SERVER-SIDE LOGGING END

    return new Response(JSON.stringify(updatedTodo), { status: 200 });
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


