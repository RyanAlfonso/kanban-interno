import { getAuthSession } from "@/lib/nextAuthOptions";
import { TodoDeleteValidator } from "@/lib/validators/todo";
import prisma from "@/lib/prismadb";
import { getLogger } from "@/logger";
import { NextRequest } from "next/server";

export async function DELETE(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();

    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();

    const { id } = TodoDeleteValidator.parse(body);

    const [record] = await prisma.todo.findMany({
      where: {
        id,
        ownerId: session.user.id,
        isDeleted: false,
      },
    });
    if (!record) return new Response("Record Not Found", { status: 404 });

    await prisma.todo.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    await prisma.todo.updateMany({
      where: {
        ownerId: session.user.id,
        state: record.state,
        order: { gt: record.order },
      },
      data: {
        order: {
          decrement: 1,
        },
      },
    });

    const result = await prisma.todo.findMany({
      where: {
        ownerId: session.user.id,
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
