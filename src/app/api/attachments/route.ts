import { getAuthSession } from "@/lib/nextAuthOptions";
import { getLogger } from "@/logger";
import prisma from "@/lib/prismadb";
import { NextRequest, NextResponse } from "next/server"; // Importar NextResponse para facilitar

// Função helper para criar respostas de erro padronizadas
const createErrorResponse = (message: string, status: number) => {
  return new NextResponse(JSON.stringify({ message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
};

export async function GET(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return createErrorResponse("Unauthorized", 401);
    }

    const url = new URL(req.url);
    const todoId = url.searchParams.get("todoId");

    if (!todoId) {
      return createErrorResponse("Missing required parameter: todoId", 400);
    }

    const attachments = await prisma.attachment.findMany({
      where: { todoId },
      include: {
        uploadedBy: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(attachments, { status: 200 });
  } catch (error) {
    logger.error("Error fetching attachments:", error);
    return createErrorResponse("Internal Server Error", 500);
  }
}

export async function POST(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return createErrorResponse("Unauthorized", 401);
    }

    const body = await req.json();
    const { filename, url, todoId } = body;

    if (!filename || !url || !todoId) {
      return createErrorResponse("Missing required fields: filename, url, todoId", 400);
    }

    const todo = await prisma.todo.findUnique({
      where: { id: todoId },
      select: { id: true },
    });

    if (!todo) {
      return createErrorResponse("Todo not found", 404);
    }

    const newAttachment = await prisma.attachment.create({
      data: {
        filename,
        url,
        todoId,
        uploadedById: session.user.id,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json(newAttachment, { status: 201 });
  } catch (error) {
    // Adiciona verificação para erros de parse do JSON no corpo da requisição
    if (error instanceof SyntaxError) {
      return createErrorResponse("Invalid JSON in request body", 400);
    }
    logger.error("Error creating attachment:", error);
    return createErrorResponse("Internal Server Error", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return createErrorResponse("Unauthorized", 401);
    }

    const url = new URL(req.url);
    const attachmentId = url.searchParams.get("id");

    if (!attachmentId) {
      return createErrorResponse("Missing required parameter: id", 400);
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: { uploadedById: true },
    });

    if (!attachment) {
      return createErrorResponse("Attachment not found", 404);
    }

    // Verifica se o usuário é admin ou o dono do anexo
    if (attachment.uploadedById !== session.user.id && session.user.role !== "ADMIN") {
      return createErrorResponse("Forbidden: You can only delete your own attachments", 403);
    }

    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    // Retorna uma resposta de sucesso com uma mensagem JSON
    return NextResponse.json({ message: "Attachment deleted successfully" }, { status: 200 });
  } catch (error) {
    logger.error("Error deleting attachment:", error);
    return createErrorResponse("Internal Server Error", 500);
  }
}