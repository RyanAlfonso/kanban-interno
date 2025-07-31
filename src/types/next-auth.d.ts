// Caminho: src/types/next-auth.d.ts (ou onde quer que seu arquivo esteja)

import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";
// 1. Importe os Enums e Tipos necessários do Prisma Client
import { Area, Role, UserType } from "@prisma/client";

declare module "next-auth" {
  /**
   * A interface Session é o que você recebe do `useSession()` ou `getAuthSession()`.
   * É o objeto final disponível para sua aplicação.
   */
  interface Session {
    user: {
      id: string;
      role: Role; // Usar o tipo Enum 'Role' para mais segurança
      type: UserType; // <<-- ADICIONADO: O tipo do usuário (SERVIDOR/COLABORADOR)
      areas: Area[];
    } & DefaultSession["user"]; // Mantém as propriedades padrão (name, email, image)
  }

  /**
   * A interface User representa o objeto do usuário como retornado pelo seu `adapter`
   * ou pela função `authorize` do provider de credenciais.
   */
  interface User extends DefaultUser {
    role: Role;
    type: UserType; // <<-- ADICIONADO: O tipo do usuário
    areas: Area[];
  }
}

declare module "next-auth/jwt" {
  /**
   * A interface JWT representa o conteúdo decodificado do seu JSON Web Token.
   * É o intermediário entre o login e a criação da sessão.
   */
  interface JWT extends DefaultJWT {
    role: Role;
    type: UserType; // <<-- ADICIONADO: O tipo do usuário
    areas: Area[];
  }
}
