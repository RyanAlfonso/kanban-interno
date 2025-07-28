// Path: kanban-interno/src/app/api/comments/route.ts
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

    const comments = await prisma.comment.findMany({
      where: { todoId },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    return new Response(JSON.stringify(comments), { status: 200 });
  } catch (error) {
    logger.error("Error fetching comments:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const { content, todoId } = body;

    if (!content || !todoId) {
      return new Response("Missing required fields: content, todoId", { status: 400 });
    }

    const todo = await prisma.todo.findUnique({
      where: { id: todoId },
      select: { id: true }
    });

    if (!todo) {
      return new Response("Todo not found", { status: 404 });
    }

    const newComment = await prisma.comment.create({
      data: {
        content,
        todoId,
        authorId: session.user.id
      },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        }
      }
    });

    return new Response(JSON.stringify(newComment), { status: 201 });
  } catch (error) {
    logger.error("Error creating comment:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const url = new URL(req.url);
    const commentId = url.searchParams.get("id");

    if (!commentId) {
      return new Response("Missing required parameter: id", { status: 400 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true }
    });

    if (!comment) {
      return new Response("Comment not found", { status: 404 });
    }

    if (comment.authorId !== session.user.id && session.user.role !== "ADMIN") {
      return new Response("Forbidden: You can only delete your own comments", { status: 403 });
    }

    await prisma.comment.delete({
      where: { id: commentId }
    });

    return new Response("Comment deleted successfully", { status: 200 });
  } catch (error) {
    logger.error("Error deleting comment:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
