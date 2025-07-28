// Path: kanban-interno/src/app/api/attachments/route.ts
import { getAuthSession } from "@/lib/nextAuthOptions";
import { getLogger } from "@/logger";
import prisma from "@/lib/prismadb";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const url = new URL(req.url);
    const todoId = url.searchParams.get("todoId");

    if (!todoId) {
      return new Response("Missing required parameter: todoId", { status: 400 });
    }

    const attachments = await prisma.attachment.findMany({
      where: { todoId },
      include: {
        uploadedBy: {
          select: { id: true, name: true, image: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return new Response(JSON.stringify(attachments), { status: 200 });
  } catch (error) {
    logger.error("Error fetching attachments:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const { filename, url, todoId } = body;

    if (!filename || !url || !todoId) {
      return new Response("Missing required fields: filename, url, todoId", { status: 400 });
    }

    const todo = await prisma.todo.findUnique({
      where: { id: todoId },
      select: { id: true }
    });

    if (!todo) {
      return new Response("Todo not found", { status: 404 });
    }

    const newAttachment = await prisma.attachment.create({
      data: {
        filename,
        url,
        todoId,
        uploadedById: session.user.id
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, image: true }
        }
      }
    });

    return new Response(JSON.stringify(newAttachment), { status: 201 });
  } catch (error) {
    logger.error("Error creating attachment:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const url = new URL(req.url);
    const attachmentId = url.searchParams.get("id");

    if (!attachmentId) {
      return new Response("Missing required parameter: id", { status: 400 });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: { uploadedById: true }
    });

    if (!attachment) {
      return new Response("Attachment not found", { status: 404 });
    }

    if (attachment.uploadedById !== session.user.id && session.user.role !== "ADMIN") {
      return new Response("Forbidden: You can only delete your own attachments", { status: 403 });
    }

    await prisma.attachment.delete({
      where: { id: attachmentId }
    });

    return new Response("Attachment deleted successfully", { status: 200 });
  } catch (error) {
    logger.error("Error deleting attachment:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
