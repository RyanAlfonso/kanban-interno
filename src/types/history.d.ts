import { ProjectColumn, TodoHistory, User } from "@prisma/client";

export interface PopulatedTodoHistoryEntry extends Omit<TodoHistory, 'userId' | 'fromColumnId' | 'toColumnId' | 'todoId'> {
  user: Pick<User, 'name' | 'email'> | null;
  fromColumn: Pick<ProjectColumn, 'name'> | null;
  toColumn: Pick<ProjectColumn, 'name'> | null;
  // todoId is already part of TodoHistory, no need to redefine unless changing its type here
}

// Example of how it might look if you also want the todo relation populated for some reason
// export interface PopulatedTodoHistoryEntryWithTodo extends PopulatedTodoHistoryEntry {
//   todo: Pick<Todo, 'id' | 'title'>;
// }
