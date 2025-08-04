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

export type TodoWithRelations = Prisma.TodoGetPayload<{
  include: {
    project: true;
    column: true;
    owner: {
      select: { id: true; name: true; image: true };
    };
    assignedTo: {
      select: { id: true; name: true; email: true; image: true };
    };
    linkedCards: {
      select: { id: true; title: true };
    };
    parent: {
      select: { id: true; title: true };
    };
    childTodos: {
      select: { id: true; title: true };
    };
    attachments: {
      include: {
        uploadedBy: {
          select: { id: true; name: true; image: true };
        };
      };
    };
    comments: {
      include: {
        author: {
          select: { id: true; name: true; image: true };
        };
      };
    };
  };
}>;


export type TodoWithColumn = Prisma.TodoGetPayload<{
  include: {
    column: true;
    project: true;
  }
}>;