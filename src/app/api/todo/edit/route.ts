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

    const { id, title, description, deadline, label, order, state } =
      TodoEditValidator.parse(body);

    const [record] = await prisma.todo.findMany({
      where: {
        id,
        ownerId: session!.user!.id,
        isDeleted: false,
      },
    });
    if (!record) return new Response("Record Not Found", { status: 404 });

    const isOrderModified =
      typeof order !== "undefined" &&
      (record.order !== order || record.state !== state);
    const changedState = record.state !== state;
    const isOrderIncreased = order && record.order < order;

    if (!isOrderModified) {
      await prisma.todo.update({
        where: { id },
        data: {
          title,
          description,
          state,
          deadline,
          label,
        },
      });
    } else if (changedState) {
      await prisma.todo.updateMany({
        where: {
          ownerId: session!.user!.id,
          state: record.state,
          order: { gt: record.order },
        },
        data: {
          order: {
            decrement: 1,
          },
        },
      });

      await prisma.todo.updateMany({
        where: {
          ownerId: session!.user!.id,
          state,
          order: { gte: order },
        },
        data: {
          order: {
            increment: 1,
          },
        },
      });

      await prisma.todo.update({
        where: { id },
        data: {
          title,
          description,
          state,
          deadline,
          label,
          order,
        },
      });
    } else if (isOrderIncreased) {
      await prisma.todo.updateMany({
        where: {
          ownerId: session!.user!.id,
          state,
          order: { gt: record.order, lte: order },
        },
        data: {
          order: {
            decrement: 1,
          },
        },
      });

      await prisma.todo.update({
        where: { id },
        data: {
          title,
          description,
          state,
          deadline,
          label,
          order,
        },
      });
    } else {
      await prisma.todo.updateMany({
        where: {
          ownerId: session!.user!.id,
          state,
          order: { lt: record.order, gte: order },
        },
        data: {
          order: {
            increment: 1,
          },
        },
      });

      await prisma.todo.update({
        where: { id },
        data: {
          title,
          description,
          state,
          deadline,
          label,
          order,
        },
      });
    }

    const result = await prisma.todo.findMany({
      where: {
        ownerId: session!.user!.id,
        isDeleted: false,
      },
      orderBy: {
        order: "asc",
      },
    });

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    logger.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
