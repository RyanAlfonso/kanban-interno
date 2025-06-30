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

    const { id, title, description, deadline, label, order, columnId, projectId } = // Added columnId and projectId
      TodoEditValidator.parse(body);

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
    if (order !== undefined) dataToUpdate.order = order;
    if (columnId !== undefined) dataToUpdate.columnId = columnId; // Update columnId if provided
    if (projectId !== undefined) dataToUpdate.projectId = projectId; // Update projectId if provided

    // Note: The 'state' field is being ignored here as we transition to columnId.
    // If 'state' still needs to be derived or used, that logic would need to be added.

    // Perform the update for the single item
    const updatedTodo = await prisma.todo.update({
      where: {
        id: record.id // Use record.id to ensure we are updating the validated record
      },
      data: dataToUpdate,
      include: { // Include relations needed by the frontend (TodoWithColumn)
        project: true,
        column: true,
        owner: true, // Assuming owner details might be useful too
      }
    });

    if (!updatedTodo) {
      // This case should ideally not be reached if the above update was successful
      // and the record existed.
      logger.error(`Failed to fetch updated todo with id: ${record.id} after update operation.`);
      return new Response("Failed to retrieve updated record after update.", { status: 500 });
    }

    // Log the updated item that will be returned
    logger.info(`Successfully updated todo with id: ${updatedTodo.id}. Returning updated record.`);
    // console.log("Returning updatedTodo:", updatedTodo); // For more verbose server-side logging if needed

    return new Response(JSON.stringify(updatedTodo), { status: 200 });
  } catch (error) {
    logger.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
