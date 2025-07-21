import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuthOptions";
import { TodoArchiveValidator } from "@/lib/validators/todo";
import prismadb from "@/lib/prismadb";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id } = TodoArchiveValidator.parse(body);

    // Verificar se a tarefa existe e pertence ao usuário
    const existingTodo = await prismadb.todo.findFirst({
      where: {
        id,
        userId: session.user.id,
        isDeleted: false,
      },
    });

    if (!existingTodo) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Arquivar a tarefa (marcar como deletada)
    await prismadb.todo.update({
      where: { id },
      data: { isDeleted: true },
    });

    // Buscar todas as tarefas não arquivadas do usuário
    const todos = await prismadb.todo.findMany({
      where: {
        userId: session.user.id,
        isDeleted: false,
      },
      include: {
        project: true,
      },
      orderBy: [
        { projectId: "asc" },
        { columnId: "asc" },
        { order: "asc" },
      ],
    });

    return NextResponse.json(todos);
  } catch (error) {
    console.error("Error archiving todo:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

