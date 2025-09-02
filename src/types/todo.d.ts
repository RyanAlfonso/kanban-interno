import { Prisma, User } from "@prisma/client";

// Tipos utilitários para manipulação de campos nulos (sem alterações aqui)
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

// Validador do Prisma para definir a estrutura do 'Todo' com suas relações
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
    // --- CORREÇÃO APLICADA AQUI ---
    // Alterado de um objeto 'select' para 'true'.
    // Isso busca o objeto 'Tag' completo, alinhando o tipo com o que
    // o 'ExtendedTask' do seu formulário de edição espera.
    tags: true,
  },
});

// Relações que são adicionadas manualmente ou vêm de outra fonte
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

// O tipo 'TodoWithRelations' agora incluirá o tipo 'Tag' completo do Prisma
// para a propriedade 'tags', resolvendo o erro de incompatibilidade.
export type TodoWithRelations = Prisma.TodoGetPayload<typeof todoFromPrisma> &
  ManualTodoRelations;

/**
 * @deprecated Use `TodoWithRelations` para uma tipagem mais precisa e completa.
 */
export type TodoWithColumn = Prisma.TodoGetPayload<{
  include: {
    column: true;
    project: true;
  };
}>;
