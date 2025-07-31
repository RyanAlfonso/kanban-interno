// src/app/api/attachments/upload/[todoId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/nextAuthOptions";
import prisma from "@/lib/prismadb";
import { writeFile, mkdir } from "fs/promises"; // Importe também o 'mkdir'
import path from "path";
import { Prisma } from "@prisma/client";
import { stat } from "fs/promises"; // Importe 'stat' para verificar a existência

type AttachmentWithUploader = Prisma.AttachmentGetPayload<{
  include: { uploadedBy: { select: { id: true; name: true; image: true } } };
}>;

// Função helper para garantir que o diretório de upload exista
async function ensureUploadDirExists() {
  const uploadDirPath = path.join(process.cwd(), "public/uploads");
  try {
    await stat(uploadDirPath); // Tenta obter o status do diretório
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Se não existe, cria o diretório recursivamente
      await mkdir(uploadDirPath, { recursive: true });
    } else {
      // Se for outro erro, lança-o
      console.error("Erro ao verificar/criar o diretório de uploads:", error);
      throw error;
    }
  }
  return uploadDirPath;
}


export async function POST(req: NextRequest, { params }: { params: { todoId: string } }) {
  // ... (código de autenticação e validação)
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
  const { todoId } = params;
  if (!todoId) {
    return NextResponse.json({ message: "O ID da tarefa é obrigatório" }, { status: 400 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ message: "Nenhum arquivo foi enviado" }, { status: 400 });
    }

    // Garante que o diretório de upload exista antes de prosseguir
    const uploadDir = await ensureUploadDirExists();

    const newAttachments: AttachmentWithUploader[] = [];

    for (const file of files) {
      const dataToWrite = new Uint8Array(await file.arrayBuffer());
      const uniqueFilename = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
      
      // Usa o caminho do diretório retornado pela função helper
      const uploadPath = path.join(uploadDir, uniqueFilename);

      await writeFile(uploadPath, dataToWrite);

      // ... (resto do código para criar o anexo no prisma)
      const newAttachment = await prisma.attachment.create({
        data: {
          filename: file.name,
          url: `/uploads/${uniqueFilename}`,
          todoId: todoId,
          uploadedById: session.user.id,
        },
        include: {
          uploadedBy: { select: { id: true, name: true, image: true } },
        },
      });
      newAttachments.push(newAttachment);
    }

    return NextResponse.json({
      message: `${newAttachments.length} anexo(s) enviado(s) com sucesso.`,
      uploadedCount: newAttachments.length,
      attachments: newAttachments,
    }, { status: 201 });

  } catch (error) {
    console.error("Erro no upload de anexo:", error);
    return NextResponse.json({ message: "Erro interno do servidor durante o upload" }, { status: 500 });
  }
}
