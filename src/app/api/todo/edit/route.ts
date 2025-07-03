import { getAuthSession } from "@/lib/nextAuthOptions";
import { TodoEditValidator } from "@/lib/validators/todo";
import { getLogger } from "@/logger";
import prisma from "@/lib/prismadb";

export async function PATCH(req) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();

    if (!session || !session?.user)
      return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    logger.info("--- Backend API (PATCH /edit): Received request body ---", JSON.stringify(body, null, 2));

    const { id, title, description, deadline, label, tags, order, columnId, projectId } = // Added columnId, projectId AND tags
      TodoEditValidator.parse(body);

    logger.info("--- Backend API (PATCH /edit): Destructured tags from body ---", JSON.stringify(tags, null, 2));

    // Fetch the existing record to compare
    const record = await prisma.todo.findUnique({
      where: {
        id,
        ownerId: session!.user!.id,
        // isDeleted: false, // No need to check isDeleted here, as we're updating, not selecting for display
      },
    });

    if (!record) {
      return new Response("Record Not Found", { status: 404 });
    }

    // --- SIMPLIFIED LOGIC ---
    // The complex reordering logic for other items based on `state` is removed for now.
    // We will focus on updating the target item's columnId and order.
    // A robust multi-item reordering solution would typically involve Prisma transactions
    // and more complex logic to adjust orders in both source and destination columns.

    const dataToUpdate: any = {};

    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (deadline !== undefined) dataToUpdate.deadline = deadline;
    if (label !== undefined) dataToUpdate.label = label;
    if (tags !== undefined) dataToUpdate.tags = tags; // Added tags to dataToUpdate
    if (order !== undefined) dataToUpdate.order = order;
    if (columnId !== undefined) dataToUpdate.columnId = columnId;
    if (projectId !== undefined) dataToUpdate.projectId = projectId;

    // Note: The 'state' field is being ignored here.

    logger.info("--- Backend API (PATCH /edit): Data being sent to Prisma update ---", JSON.stringify(dataToUpdate, null, 2));

    // Perform the update for the single item
    const updatedTodo = await prisma.todo.update({
      where: {
        id: record.id
      },
      data: dataToUpdate,
      include: {
        project: true,
        column: true,
        owner: true,
      }
    });

    logger.info("--- Backend API (PATCH /edit): Todo returned from Prisma update ---", JSON.stringify(updatedTodo, null, 2));

    if (!updatedTodo) {
      logger.error(`--- Backend API (PATCH /edit): Failed to fetch updated todo with id: ${record.id} after update operation.`);
      return new Response("Failed to retrieve updated record after update.", { status: 500 });
    }

    // Log the updated item that will be returned - this is already covered by the logger.info above.
    // logger.info(`Successfully updated todo with id: ${updatedTodo.id}. Returning updated record.`);

    return new Response(JSON.stringify(updatedTodo), { status: 200 });
  } catch (error) {
    logger.error("--- Backend API (PATCH /edit): Error in PATCH handler ---", error); // Enhanced error logging
    return new Response("Internal Server Error", { status: 500 });
  }
}
