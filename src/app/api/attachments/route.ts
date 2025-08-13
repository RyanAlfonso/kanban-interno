import { getAuthSession } from "@/lib/nextAuthOptions";
import { getLogger } from "@/logger";
import prisma from "@/lib/prismadb";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createErrorResponse = (message: string, status: number) => {
  return new NextResponse(JSON.stringify({ message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const getAttachmentsSchema = z.object({
  todoId: z.string().uuid("Invalid Todo ID format"),
});

const createAttachmentSchema = z.object({
  filename: z.string().min(1, "Filename cannot be empty."),
  url: z.string().url("A valid URL is required."),
  todoId: z.string().uuid("Invalid Todo ID format"),
});

const deleteAttachmentSchema = z.object({
  id: z.string().uuid("Invalid Attachment ID format"),
});

export async function GET(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return createErrorResponse("Unauthorized", 401);

    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const validation = getAttachmentsSchema.safeParse(params);

    if (!validation.success) {
      return createErrorResponse(validation.error.errors[0].message, 400);
    }

    const attachments = await prisma.attachment.findMany({
      where: { todoId: validation.data.todoId },
      include: {
        uploadedBy: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(attachments, { status: 200 });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error("Error fetching attachments:", errorMessage);
    return createErrorResponse("Internal Server Error", 500);
  }
}

export async function POST(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return createErrorResponse("Unauthorized", 401);

    const body = await req.json();
    const validation = createAttachmentSchema.safeParse(body);

    if (!validation.success) {
      return createErrorResponse(validation.error.errors[0].message, 400);
    }

    const { filename, url, todoId } = validation.data;

    const todo = await prisma.todo.findUnique({ where: { id: todoId } });
    if (!todo) return createErrorResponse("Todo not found", 404);

    const newAttachment = await prisma.attachment.create({
      data: { filename, url, todoId, uploadedById: session.user.id },
      include: {
        uploadedBy: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json(newAttachment, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return createErrorResponse("Invalid JSON in request body", 400);
    }
    const errorMessage = getErrorMessage(error);
    logger.error("Error creating attachment:", errorMessage);
    return createErrorResponse("Internal Server Error", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();
    if (!session?.user) return createErrorResponse("Unauthorized", 401);

    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const validation = deleteAttachmentSchema.safeParse(params);

    if (!validation.success) {
      return createErrorResponse(validation.error.errors[0].message, 400);
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: validation.data.id },
      select: { uploadedById: true },
    });

    if (!attachment) return createErrorResponse("Attachment not found", 404);

    const isOwner = attachment.uploadedById === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return createErrorResponse(
        "Forbidden: You do not have permission to delete this attachment",
        403
      );
    }

    await prisma.attachment.delete({ where: { id: validation.data.id } });

    return NextResponse.json(
      { message: "Attachment deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error("Error deleting attachment:", errorMessage);
    return createErrorResponse("Internal Server Error", 500);
  }
}
