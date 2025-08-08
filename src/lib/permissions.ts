
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

interface PermissionResult {
  allowed: boolean;
  error?: string;
}

/**
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

export function getAvailableMovements(
  fromColumnName: string,
  userType: UserType
): string[] {
  const availableColumns: string[] = [];

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
