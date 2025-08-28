// Localização: app/api/todo/[id]/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb"; // Verifique se este caminho está correto
import { getAuthSession } from "@/lib/nextAuthOptions"; // Verifique se este caminho está correto

type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse("Não autenticado", { status: 401 });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { message: "ID do card não fornecido." },
        { status: 400 }
      );
    }

    // 1. Busca o 'todo' principal
    const todo = await prisma.todo.findUnique({
      where: { id: id },
      include: {
        project: true,
        parent: true,
        childTodos: true,
        attachments: { include: { uploadedBy: true } },
        comments: { include: { author: true } },
        movementHistory: {
          include: {
            movedBy: true,
            fromColumn: true,
            toColumn: true,
          },
          orderBy: { movedAt: "desc" },
        },
      },
    });

    if (!todo) {
      return NextResponse.json(
        { message: "Card não encontrado." },
        { status: 404 }
      );
    }

    // 2. Busca as relações que não são diretas no esquema
    const assignedUsers = await prisma.user.findMany({
      where: { id: { in: todo.assignedToIds } },
      select: { id: true, name: true, email: true, image: true },
    });

    const linkedCards = await prisma.todo.findMany({
      where: { id: { in: todo.linkedCardIds } },
      select: { id: true, title: true },
    });

    // 3. Combina tudo em um único objeto para a resposta
    const todoWithRelations = {
      ...todo,
      assignedTo: assignedUsers,
      linkedCards: linkedCards,
    };

    return NextResponse.json(todoWithRelations, { status: 200 });
  } catch (error) {
    console.error(`Erro na rota /api/todo/[id] para o ID ${params.id}:`, error);
    return NextResponse.json(
      { message: "Erro interno do servidor ao buscar o card." },
      { status: 500 }
    );
  }
}
