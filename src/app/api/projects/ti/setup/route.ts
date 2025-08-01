// Path: kanban-interno/src/app/api/projects/ti/setup/route.ts
import { getAuthSession } from "@/lib/nextAuthOptions";
import { getLogger } from "@/logger";
import prisma from "@/lib/prismadb";
import { NextRequest } from "next/server";
// ================== CORREÇÃO APLICADA AQUI ==================
// 1. Importe as constantes do seu arquivo de permissões.
import { COLUMNS } from "@/lib/permissions";

// 2. Use as constantes importadas para definir as colunas.
const TI_COLUMNS = [
  { name: COLUMNS.BACKLOG, order: 1 },
  { name: COLUMNS.EM_EXECUCAO, order: 2 },
  { name: COLUMNS.EM_APROVACAO, order: 3 },
  { name: COLUMNS.MONITORAMENTO, order: 4 },
  { name: COLUMNS.CONCLUIDA, order: 5 }
];
// ============================================================

export async function POST(req: NextRequest) {
  const logger = getLogger("info");
  try {
    const session = await getAuthSession();

    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || user.role !== "ADMIN") {
      return new Response("Forbidden: Admin access required", { status: 403 });
    }

    let tiProject = await prisma.project.findFirst({
      where: { name: "T.I" },
      include: { columns: true }
    });

    if (!tiProject) {
      tiProject = await prisma.project.create({
        data: {
          name: "T.I",
          description: "Projeto da área de Tecnologia da Informação"
        },
        include: { columns: true }
      });
    }

    for (const columnData of TI_COLUMNS) {
      const existingColumn = tiProject.columns.find(col => col.name === columnData.name);
      
      if (!existingColumn) {
        await prisma.projectColumn.create({
          data: {
            name: columnData.name,
            order: columnData.order,
            projectId: tiProject.id
          }
        });
      }
    }

    const updatedProject = await prisma.project.findUnique({
      where: { id: tiProject.id },
      include: { 
        columns: {
          orderBy: { order: "asc" }
        }
      }
    });

    return new Response(JSON.stringify(updatedProject), { status: 200 });
  } catch (error) {
    logger.error("Error setting up TI project:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
