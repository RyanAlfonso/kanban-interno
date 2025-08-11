// Caminho: src/types/todo.ts

import { Prisma, User } from "@prisma/client";

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

const todoFromPrisma = Prisma.validator<Prisma.TodoDefaultArgs>()({
  include: {
    project: true,
    column: true,
    owner: {
      select: { id: true, name: true, image: true },
    },
    parent: {
      select: { id: true, title: true },
    },
    childTodos: {
      select: { id: true, title: true },
    },
    attachments: {
      include: {
        uploadedBy: {
          select: { id: true, name: true, image: true },
        },
      },
    },
    comments: {
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
    },
  },
});

type ManualTodoRelations = {
  assignedTo: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  }[];
  linkedCards: {
    id: string;
    title: string;
  }[];
};

export type TodoWithRelations = Prisma.TodoGetPayload<typeof todoFromPrisma> & ManualTodoRelations;


/**
 * @deprecated Use `TodoWithRelations` para uma tipagem mais precisa e completa.
 */
export type TodoWithColumn = Prisma.TodoGetPayload<{
  include: {
    column: true;
    project: true;
  }
}>;