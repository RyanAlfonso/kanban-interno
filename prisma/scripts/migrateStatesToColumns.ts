import { PrismaClient, Project, Todo, State as OldState } from '@prisma/client';

const prisma = new PrismaClient();

// Define the desired order of columns based on the old State enum
const stateOrder: OldState[] = [OldState.TODO, OldState.IN_PROGRESS, OldState.REVIEW, OldState.DONE];

async function main() {
  console.log('Starting migration of Todo states to ProjectColumns...');

  const projects = await prisma.project.findMany({
    include: {
      todos: {

        select: {
          id: true,
          state: true,
          projectId: true,
        },
      },
    },
  });

  if (projects.length === 0) {
    console.log('No projects found. Nothing to migrate.');
    return;
  }

  console.log(`Found ${projects.length} projects to process.`);

  for (const project of projects) {
    console.log(`Processing project: ${project.name} (ID: ${project.id})`);

    const todosInProject = await prisma.todo.findMany({
        where: { projectId: project.id, isDeleted: false }, // Consider only active todos
        select: { id: true, state: true, order: true } // Old state and order
    });

    if (todosInProject.length === 0) {
      console.log(`  No todos found in project ${project.name}. Skipping column creation and todo updates for this project.`);
      continue;
    }

    const distinctStatesInProject = Array.from(new Set(todosInProject.map(t => t.state))).filter(s => s !== null) as OldState[];

    if (distinctStatesInProject.length === 0) {
        console.log(`  No distinct states found among todos in project ${project.name}. Skipping.`);
        continue;
    }

    console.log(`  Distinct states found in project ${project.name}: ${distinctStatesInProject.join(', ')}`);

    // Sort distinct states according to the predefined order
    const sortedDistinctStates = distinctStatesInProject.sort((a, b) => {
        return stateOrder.indexOf(a) - stateOrder.indexOf(b);
    });

    const stateToColumnIdMap = new Map<OldState, string>();

    for (let i = 0; i < sortedDistinctStates.length; i++) {
      const stateValue = sortedDistinctStates[i];
      const columnName = stateValue.toString(); // e.g., "TODO", "IN_PROGRESS"
      const columnOrder = i;

      // Check if a column with this name already exists for this project
      let column = await prisma.projectColumn.findUnique({
        where: {
          projectId_name: {
            projectId: project.id,
            name: columnName,
          },
        },
      });

      if (!column) {
        console.log(`  Creating column "${columnName}" with order ${columnOrder} for project ${project.name}`);
        column = await prisma.projectColumn.create({
          data: {
            name: columnName,
            order: columnOrder,
            projectId: project.id,
          },
        });
        console.log(`    Column "${columnName}" created with ID: ${column.id}`);
      } else {
        console.log(`  Column "${columnName}" already exists with ID: ${column.id}. Ensuring order is ${columnOrder}.`);
        if (column.order !== columnOrder) {
            await prisma.projectColumn.update({
                where: { id: column.id },
                data: { order: columnOrder }
            });
            console.log(`    Column "${columnName}" order updated to ${columnOrder}.`);
        }
      }
      stateToColumnIdMap.set(stateValue, column.id);
    }

    // Now update todos in this project
    let updatedTodosCount = 0;
    for (const todo of todosInProject) {
      if (todo.state && !await prisma.todo.findUnique({where: {id: todo.id}})?.columnId) { // Check columnId again in case script is re-run
        const targetColumnId = stateToColumnIdMap.get(todo.state);
        if (targetColumnId) {
          await prisma.todo.update({
            where: { id: todo.id },
            data: {
              columnId: targetColumnId,
              // state: null, // If you want to explicitly nullify the old state field if it still exists in DB schema
            },
          });
          updatedTodosCount++;
        } else {
          console.warn(`  Could not find matching column for todo ID ${todo.id} with old state ${todo.state}. Skipping update for this todo.`);
        }
      }
    }
    if (updatedTodosCount > 0) {
        console.log(`  Updated ${updatedTodosCount} todos in project ${project.name} with new columnIds.`);
    } else {
        console.log(`  No todos needed updating in project ${project.name} (either already migrated or no matching states).`);
    }
  }

  console.log('Migration script finished.');
}

main()
  .catch(async (e) => {
    console.error('Error during migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
