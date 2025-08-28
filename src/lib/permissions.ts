import { UserType } from "@prisma/client";

export const COLUMNS = {
  BACKLOG: "BackLog",
  EM_EXECUCAO: "Em execução",
  EM_APROVACAO: "Em Aprovação",
  MONITORAMENTO: "Monitoramento",
  CONCLUIDA: "Concluída",
};

export const USER_TYPES = {
  SERVIDOR: "SERVIDOR",
  COLABORADOR: "COLABORADOR",
} as const;

// Interface para o resultado da verificação de permissão
interface PermissionResult {
  allowed: boolean;
  error?: string;
}

/**
 * Verifica se um usuário pode mover um card de uma coluna para outra,
 * considerando o tipo de usuário e as regras de negócio do card (como a data).
 *
 * @param fromColumnName - O nome da coluna de origem.
 * @param toColumnName - O nome da coluna de destino.
 * @param userType - O tipo do usuário ('SERVIDOR' ou 'COLABORADOR').
 * @param cardData - Os dados do card, especificamente o deadline, para validações de regras de negócio.
 * @returns Um objeto { allowed: boolean, error?: string }.
 */
export function canMoveCard(
  fromColumnName: string,
  toColumnName: string,
  userType: UserType,
  cardData: { deadline: Date | null | undefined }
): PermissionResult {
  const movement = `${fromColumnName} -> ${toColumnName}`;

  if (toColumnName === COLUMNS.EM_EXECUCAO && !cardData.deadline) {
    return {
      allowed: false,
      error: "O prazo é obrigatório para mover um card para 'Em Execução'.",
    };
  }
  // --- FIM: NOVA REGRA DE VALIDAÇÃO DE DATA ---

  // Lógica de permissão de movimento baseada no tipo de usuário (inalterada)
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
    [`${COLUMNS.EM_APROVACAO} -> ${COLUMNS.CONCLUIDA}`]: [USER_TYPES.SERVIDOR],
    // 3.3 - Revisar demanda (Apenas Servidores)
    [`${COLUMNS.EM_APROVACAO} -> ${COLUMNS.EM_EXECUCAO}`]: [
      USER_TYPES.SERVIDOR,
    ],
    // 4.1 - Retomar demanda (Todos)
    [`${COLUMNS.MONITORAMENTO} -> ${COLUMNS.EM_EXECUCAO}`]: "ALL",
    // 4.2 - Finalizar demanda (Apenas Servidores)
    [`${COLUMNS.MONITORAMENTO} -> ${COLUMNS.CONCLUIDA}`]: [USER_TYPES.SERVIDOR],
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

/**
 * Retorna uma lista de nomes de colunas para as quais um usuário pode mover um card
 * a partir de uma coluna de origem.
 *
 * @param fromColumnName - O nome da coluna de origem.
 * @param userType - O tipo do usuário.
 * @returns Um array de strings com os nomes das colunas de destino permitidas.
 */
export function getAvailableMovements(
  fromColumnName: string,
  userType: UserType
): string[] {
  const availableColumns: string[] = [];

  // A definição de allowedMovements é repetida aqui.
  // Para melhor manutenção, você poderia definir isso uma vez fora das funções.
  const allowedMovements: { [key: string]: "ALL" | UserType[] } = {
    [`${COLUMNS.BACKLOG} -> ${COLUMNS.EM_EXECUCAO}`]: "ALL",
    [`${COLUMNS.EM_EXECUCAO} -> ${COLUMNS.EM_APROVACAO}`]: "ALL",
    [`${COLUMNS.EM_APROVACAO} -> ${COLUMNS.MONITORAMENTO}`]: [
      USER_TYPES.SERVIDOR,
    ],
    [`${COLUMNS.EM_APROVACAO} -> ${COLUMNS.CONCLUIDA}`]: [USER_TYPES.SERVIDOR],
    [`${COLUMNS.EM_APROVACAO} -> ${COLUMNS.EM_EXECUCAO}`]: [
      USER_TYPES.SERVIDOR,
    ],
    [`${COLUMNS.MONITORAMENTO} -> ${COLUMNS.EM_EXECUCAO}`]: "ALL",
    [`${COLUMNS.MONITORAMENTO} -> ${COLUMNS.CONCLUIDA}`]: [USER_TYPES.SERVIDOR],
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
