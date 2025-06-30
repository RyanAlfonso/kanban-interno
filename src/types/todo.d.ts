import { Todo } from "@prisma/client";

type PickNullable<T> = {
  [P in keyof T as null extends T[P] ? P : never]: T[P];
};

type PickNotNullable<T> = {
  [P in keyof T as null extends T[P] ? never : P]: T[P];
};

type OptionalNullable<T> = {
  [K in keyof PickNullable<T>]?: Exclude<T[K], null>;
} & {
  [K in keyof PickNotNullable<T>]: T[K];
};

declare global {
  interface OptionalTodo extends OptionalNullable<Todo> {}
}

// Represents the structure of the 'column' object when included with a Todo
export interface EmbeddedProjectColumn {
  id: string;
  name: string;
  order: number;
}

// Extends the Prisma Todo type to include the 'column' relation
export type TodoWithColumn = Todo & {
  column?: EmbeddedProjectColumn | null; // Column can be null if todo is not assigned to any
};
