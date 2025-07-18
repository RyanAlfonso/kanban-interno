"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const projectColumns = await prisma.projectColumn.findMany();
    for (const column of projectColumns) {
        let state = null;
        let isFixed = false;
        switch (column.name.toUpperCase()) {
            case 'TODO':
                state = client_1.State.TODO;
                isFixed = true;
                break;
            case 'IN PROGRESS':
                state = client_1.State.IN_PROGRESS;
                isFixed = true;
                break;
            case 'REVIEW':
                state = client_1.State.REVIEW;
                isFixed = true;
                break;
            case 'DONE':
                state = client_1.State.DONE;
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
