import { getAuthSession } from "@/lib/nextAuthOptions";
import prisma from "@/lib/prismadb";
import { getLogger } from "@/logger";
import { Todo } from "@prisma/client";

export async function GET(req) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();

    if (!session || !session?.user)
      return new Response("Unauthorized", { status: 401 });

    const todos: Pick<Todo, "label">[] = await prisma.todo.findMany({
      where: {
        ownerId: session!.user!.id,
        isDeleted: false,
      },
      select: {
        label: true,
      },
    });

    const filteredLabels = Array.from(
      new Set(todos.flatMap((todo) => todo.label)),
    );

    return new Response(JSON.stringify(filteredLabels), { status: 200 });
  } catch (error) {
    logger.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
