import { UserType } from "@prisma/client";

export interface MovementRule {
  from: string;
  to: string;
  allowedUserTypes: UserType[];
  description: string;
}

export const MOVEMENT_RULES: MovementRule[] = [
  {
    from: "BackLog",
    to: "Em execução",
    allowedUserTypes: [UserType.SERVIDOR, UserType.COLABORADOR],
    description: "1.1 - Iniciar demanda. Todos os perfis podem realizar esse movimento"
  },
  {
    from: "Em execução",
    to: "Em Aprovação",
    allowedUserTypes: [UserType.SERVIDOR, UserType.COLABORADOR],
    description: "2.1 - Submeter demanda. Todos os perfis"
  },
  {
    from: "Em Aprovação",
    to: "Monitoramento",
    allowedUserTypes: [UserType.SERVIDOR],
    description: "3.1 - Monitorar demanda. Apenas servidores"
  },
  {
    from: "Em Aprovação",
    to: "Concluída",
    allowedUserTypes: [UserType.SERVIDOR],
    description: "3.2 - Aprovar demanda. Apenas servidores"
  },
  {
    from: "Monitoramento",
    to: "Em execução",
    allowedUserTypes: [UserType.SERVIDOR],
    description: "3.3 - Revisar demanda. Apenas servidores"
  },
  {
    from: "Monitoramento",
    to: "Concluída",
    allowedUserTypes: [UserType.SERVIDOR],
    description: "4.2 - Finalizar demanda. Apenas servidores"
  }
];

export const RETOMAR_DEMANDA_RULE = {
  to: "Em execução",
  allowedUserTypes: [UserType.SERVIDOR, UserType.COLABORADOR],
  description: "4.1 - Retomar demanda. Todos os perfis podem retomar para Em execução"
};

export function canMoveCard(
  fromColumnName: string,
  toColumnName: string,
  userType: UserType
): { allowed: boolean; rule?: MovementRule; error?: string } {
  if (toColumnName === "Em execução" && fromColumnName !== "BackLog" && fromColumnName !== "Em Aprovação") {
    const retomar = RETOMAR_DEMANDA_RULE.allowedUserTypes.includes(userType);
    return {
      allowed: retomar,
      rule: retomar ? {
        from: fromColumnName,
        to: toColumnName,
        allowedUserTypes: RETOMAR_DEMANDA_RULE.allowedUserTypes,
        description: RETOMAR_DEMANDA_RULE.description
      } : undefined,
      error: retomar ? undefined : "Usuário não tem permissão para retomar demanda"
    };
  }

  const rule = MOVEMENT_RULES.find(r => r.from === fromColumnName && r.to === toColumnName);
  
  if (!rule) {
    return {
      allowed: false,
      error: `Movimento de "${fromColumnName}" para "${toColumnName}" não é permitido`
    };
  }

  const allowed = rule.allowedUserTypes.includes(userType);
  
  return {
    allowed,
    rule: allowed ? rule : undefined,
    error: allowed ? undefined : `Usuário do tipo ${userType} não tem permissão para este movimento`
  };
}

export function getAvailableMovements(fromColumnName: string, userType: UserType): string[] {
  const availableColumns: string[] = [];

  if (fromColumnName !== "Em execução") {
    if (RETOMAR_DEMANDA_RULE.allowedUserTypes.includes(userType)) {
      availableColumns.push("Em execução");
    }
  }

  MOVEMENT_RULES
    .filter(rule => rule.from === fromColumnName && rule.allowedUserTypes.includes(userType))
    .forEach(rule => {
      if (!availableColumns.includes(rule.to)) {
        availableColumns.push(rule.to);
      }
    });

  return availableColumns;
}