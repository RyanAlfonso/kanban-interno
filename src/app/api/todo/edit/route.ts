// Caminho: kanban-interno/src/app/api/todo/edit/route.ts
import { getAuthSession } from "@/lib/nextAuthOptions";
import prisma from "@/lib/prismadb";
import { TodoEditValidator } from "@/lib/validators/todo";
import { getLogger } from "@/logger";
import { revalidatePath } from "next/cache";

export async function PATCH(req: Request) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();

    if (!session?.user) return new Response("Não autorizado", { status: 401 });

    const body = await req.json();
    const { id, title, description, deadline, label, tags, columnId, assignedToIds, parentId, linkedCardIds, referenceDocument } = TodoEditValidator.parse(body);

    // Busca o 'todo' atual para verificar a propriedade e obter a coluna atual
    const currentTodo = await prisma.todo.findUnique({
      where: { id },
      include: { column: true }
    });

    if (!currentTodo) {
      return new Response("Tarefa não encontrada", { status: 404 });
    }

    if (currentTodo.ownerId !== session.user.id) {
      return new Response("Não autorizado", { status: 401 });
    }

    // Prepara os dados para a atualização
    const dataToUpdate: any = {
      title,
      description,
      deadline,
      label,
      tags,
      assignedToIds, // Adiciona os IDs dos usuários atribuídos
      linkedCardIds, // Adiciona os IDs dos cards vinculados
      referenceDocument, // Adiciona o documento de referência
    };

    // Lida com a conexão/desconexão do 'parent' (tarefa-pai)
    if (parentId !== undefined) {
      // Se parentId for uma string não vazia, conecta a relação.
      if (parentId) {
        dataToUpdate.parent = { connect: { id: parentId } };
      }
      // Caso contrário (se parentId for nulo ou uma string vazia), 
      // desconecta o 'parent' atual, se ele existir.
      else if (currentTodo.parentId) {
        dataToUpdate.parent = { disconnect: true };
      }
    }

    // Lida com a mudança de coluna e o histórico de movimentação
    if (columnId && columnId !== currentTodo.columnId) {
      dataToUpdate.column = { connect: { id: columnId } };
      
      // Cria uma entrada no histórico de movimentação
      dataToUpdate.movementHistory = {
        create: {
          movedBy: { connect: { id: session.user.id } },
          fromColumn: { connect: { id: currentTodo.columnId } },
          toColumn: { connect: { id: columnId } },
          movedAt: new Date(),
        }
      };
    }

    logger.info("--- API Backend (PATCH /edit): Dados sendo enviados para o Prisma update ---", JSON.stringify(dataToUpdate, null, 2));

    // Executa a atualização para o item individual
    const updatedTodo = await prisma.todo.update({
      where: {
        id: id
      },
      data: dataToUpdate,
      include: {
        project: true,
        column: true,
        owner: true,
        movementHistory: { // Inclui o histórico de movimentação
          include: {
            movedBy: { select: { id: true, name: true } },
            fromColumn: { select: { id: true, name: true } },
            toColumn: { select: { id: true, name: true } },
          },
          orderBy: { movedAt: "asc" },
        },
        parent: { select: { id: true, title: true } },     // Inclui o 'parent'
        childTodos: { select: { id: true, title: true } }, // Inclui os 'childTodos'
      }
    });

    // Busca os usuários atribuídos separadamente, pois não podemos usar a relação direta
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

    // Revalida o cache para as páginas do dashboard e do board
    revalidatePath("/dashboard");
    revalidatePath("/");

    return new Response(JSON.stringify(resultWithAssignedUsers), { status: 200 });
  } catch (error) {
    logger.error(error);
    if (error instanceof z.ZodError) {
        return new Response(JSON.stringify(error.issues), { status: 400 });
    }
    return new Response("Erro Interno do Servidor", { status: 500 });
  }
}