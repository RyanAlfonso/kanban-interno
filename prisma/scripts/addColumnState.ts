import { PrismaClient, State } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const projectColumns = await prisma.projectColumn.findMany();

  for (const column of projectColumns) {
    let state: State | null = null;
    let isFixed = false;

    switch (column.name.toUpperCase()) {
      case 'TODO':
        state = State.TODO;
        isFixed = true;
        break;
      case 'IN PROGRESS':
        state = State.IN_PROGRESS;
        isFixed = true;
        break;
      case 'REVIEW':
        state = State.REVIEW;
        isFixed = true;
        break;
      case 'DONE':
        state = State.DONE;
        isFixed = true;
        break;
      default:
        break;
    }

    if (state) {
      await prisma.projectColumn.update({
        where: { id: column.id },
        data: { state, isFixed },
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
