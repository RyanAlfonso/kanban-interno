import { getAuthSession } from "@/lib/nextAuthOptions";
import prisma from "@/lib/prismadb";
import { TodoEditValidator } from "@/lib/validators/todo";
import { getLogger } from "@/logger";
import { revalidatePath } from "next/cache";

export async function PATCH(req) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();

    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const { id, title, description, deadline, label, tags, columnId, assignedToIds, parentId, linkedCardIds } = TodoEditValidator.parse(body);

    // Fetch the current todo to check ownership and get current column
    const currentTodo = await prisma.todo.findUnique({
      where: { id },
      include: { column: true }
    });

    if (!currentTodo) {
      return new Response("Todo not found", { status: 404 });
    }

    if (currentTodo.ownerId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Prepare the update data
    const dataToUpdate: any = {
      title,
      description,
      deadline,
      label,
      tags,
      assignedToIds, // Added assignedToIds
      linkedCardIds, // Added linkedCardIds
    };

    // Handle parent connection/disconnection
    if (parentId !== undefined) {
      if (parentId === null) {
        dataToUpdate.parent = { disconnect: true };
      } else {
        dataToUpdate.parent = { connect: { id: parentId } };
      }
    }

    // Handle column change and movement history
    if (columnId && columnId !== currentTodo.columnId) {
      dataToUpdate.column = { connect: { id: columnId } };
      
      // Create movement history entry
      dataToUpdate.movementHistory = {
        create: {
          movedBy: { connect: { id: session.user.id } },
          fromColumn: { connect: { id: currentTodo.columnId } },
          toColumn: { connect: { id: columnId } },
          movedAt: new Date(),
        }
      };
    }

    logger.info("--- Backend API (PATCH /edit): Data being sent to Prisma update ---", JSON.stringify(dataToUpdate, null, 2));

    // Perform the update for the single item
    const updatedTodo = await prisma.todo.update({
      where: {
        id: id
      },
      data: dataToUpdate,
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
        // linkedCards: { select: { id: true, title: true } }, // Include linkedCards (if needed for display)
      }
    });

    // Fetch assigned users separately since we can\'t use direct relation
    const assignedUsers = await prisma.user.findMany({
      where: {
        id: { in: updatedTodo.assignedToIds },
      },
      select: { id: true, name: true, email: true, image: true },
    });

    const resultWithAssignedUsers = {
      ...updatedTodo,
      assignedTo: assignedUsers,
    };

    // Revalidate the cache for the dashboard and board pages
    revalidatePath("/dashboard");
    revalidatePath("/");

    return new Response(JSON.stringify(resultWithAssignedUsers), { status: 200 });
  } catch (error) {
    logger.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

