// Caminho completo: kanban-interno/src/lib/permissions.ts

import { UserType } from "@prisma/client";

// Usar constantes para os nomes das colunas.
export const COLUMNS = {
  BACKLOG: "Backlog",
  EM_EXECUCAO: "Em Execução",
  EM_APROVACAO: "Em Aprovação",
  MONITORAMENTO: "Monitoramento",
  CONCLUIDO: "Concluído",
};

// ================== A CORREÇÃO ESTÁ AQUI ==================
// Adicionamos 'as const' para que o TypeScript trate os valores como tipos literais
// e não como strings genéricas. Isso resolve o erro de tipagem.
export const USER_TYPES = {
  SERVIDOR: "SERVIDOR",
  COLABORADOR: "COLABORADOR",
} as const;
// ==========================================================

// Interface para a resposta da função de permissão.
interface PermissionResult {
  allowed: boolean;
  error?: string;
}

/**
 * Verifica se um usuário pode mover um card de uma coluna para outra.
 * @param fromColumnName - O nome da coluna de origem.
 * @param toColumnName - O nome da coluna de destino.
 * @param userType - O tipo do usuário ('SERVIDOR' ou 'COLABORADOR').
 * @returns Um objeto { allowed: boolean, error?: string }.
 */
export function canMoveCard(
  fromColumnName: string,
  toColumnName: string,
  userType: UserType
): PermissionResult {
  const movement = `${fromColumnName} -> ${toColumnName}`;

  // Mapeamento centralizado de TODAS as regras de negócio.
  // Agora o TypeScript entende que os valores de USER_TYPES são compatíveis com UserType.
  const allowedMovements: { [key: string]: "ALL" | UserType[] } = {
    // 1.1 - Iniciar demanda (Todos)
    [`${COLUMNS.BACKLOG} -> ${COLUMNS.EM_EXECUCAO}`]: "ALL",
    // 2.1 - Submeter demanda (Todos)
    [`${COLUMNS.EM_EXECUCAO} -> ${COLUMNS.EM_APROVACAO}`]: "ALL",
    // 3.1 - Monitorar demanda (Apenas Servidores)
    [`${COLUMNS.EM_APROVACAO} -> ${COLUMNS.MONITORAMENTO}`]: [
      USER_TYPES.SERVIDOR,
    ],
    // 3.2 - Aprovar demanda (Apenas Servidores)
    [`${COLUMNS.EM_APROVACAO} -> ${COLUMNS.CONCLUIDO}`]: [USER_TYPES.SERVIDOR],
    // 3.3 - Revisar demanda (Apenas Servidores)
    [`${COLUMNS.EM_APROVACAO} -> ${COLUMNS.EM_EXECUCAO}`]: [
      USER_TYPES.SERVIDOR,
    ],
    // 4.1 - Retomar demanda (Todos)
    [`${COLUMNS.MONITORAMENTO} -> ${COLUMNS.EM_EXECUCAO}`]: "ALL",
    // 4.2 - Finalizar demanda (Apenas Servidores)
    [`${COLUMNS.MONITORAMENTO} -> ${COLUMNS.CONCLUIDO}`]: [USER_TYPES.SERVIDOR],
  };

  const permission = allowedMovements[movement];

  if (!permission) {
    return {
      allowed: false,
      error: `Movimento de "${fromColumnName}" para "${toColumnName}" não é permitido.`,
    };
  }

  if (permission === "ALL") {
    return { allowed: true };
  }

  if (permission.includes(userType)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    error: "Você não tem permissão para realizar este movimento.",
  };
}

// Função para obter os movimentos disponíveis (opcional, mas útil para o frontend)
// Esta função também se beneficia da correção, mas não precisa de alterações diretas.
export function getAvailableMovements(
  fromColumnName: string,
  userType: UserType
): string[] {
  const availableColumns: string[] = [];

  // Recriando a referência ao objeto de regras para usar dentro desta função
  const allowedMovements: { [key: string]: "ALL" | UserType[] } = {
    [`${COLUMNS.BACKLOG} -> ${COLUMNS.EM_EXECUCAO}`]: "ALL",
    [`${COLUMNS.EM_EXECUCAO} -> ${COLUMNS.EM_APROVACAO}`]: "ALL",
    [`${COLUMNS.EM_APROVACAO} -> ${COLUMNS.MONITORAMENTO}`]: [
      USER_TYPES.SERVIDOR,
    ],
    [`${COLUMNS.EM_APROVACAO} -> ${COLUMNS.CONCLUIDO}`]: [USER_TYPES.SERVIDOR],
    [`${COLUMNS.EM_APROVACAO} -> ${COLUMNS.EM_EXECUCAO}`]: [
      USER_TYPES.SERVIDOR,
    ],
    [`${COLUMNS.MONITORAMENTO} -> ${COLUMNS.EM_EXECUCAO}`]: "ALL",
    [`${COLUMNS.MONITORAMENTO} -> ${COLUMNS.CONCLUIDO}`]: [USER_TYPES.SERVIDOR],
  };

  Object.entries(allowedMovements).forEach(([movement, permission]) => {
    const [from, to] = movement.split(" -> ");
    if (from === fromColumnName) {
      if (permission === "ALL" || permission.includes(userType)) {
        if (!availableColumns.includes(to)) {
          availableColumns.push(to);
        }
      }
    }
  });

  return availableColumns;
}
