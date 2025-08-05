// Caminho: src/types/todo.ts

import { Prisma, User } from "@prisma/client";

// Seus tipos utilitários existentes (mantidos para qualquer outro uso que você possa ter)
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

// ================== NOVO CÓDIGO ADICIONADO ==================

/**
 * Define o tipo completo para uma Tarefa (Todo), incluindo todas as suas
 * relações diretas e os arrays de anexos e comentários com seus próprios dados aninhados.
 * 
 * Este tipo é gerado dinamicamente a partir do seu schema Prisma, garantindo que
 * o frontend e o backend estejam sempre sincronizados. Ele deve ser usado em toda
 * a aplicação (componentes, hooks, funções de requisição) sempre que você
 * estiver lidando com uma tarefa que tenha suas relações carregadas.
 */
export type TodoWithRelations = Prisma.TodoGetPayload<{
  include: {
    project: true;
    column: true;
    owner: {
      select: { id: true; name: true; image: true };
    };
    // Este campo é populado manualmente na API, mas o definimos aqui para tipagem.
    // O tipo real é User[], mas para o select, usamos o que a API retorna.
    assignedTo: {
      select: { id: true; name: true; email: true; image: true };
    };
    // Este campo também é populado manualmente na API.
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


/**
 * @deprecated Use `TodoWithRelations` para uma tipagem mais precisa e completa.
 * Este tipo é mantido para compatibilidade, mas `TodoWithRelations` é preferível
 * pois é gerado diretamente do schema Prisma e inclui todas as relações.
 */
export type TodoWithColumn = Prisma.TodoGetPayload<{
  include: {
    column: true;
    project: true;
  }
}>;

// =============================================================
