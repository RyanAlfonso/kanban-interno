import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";
import { Area } from "@prisma/client"; // Importando o tipo Area do Prisma

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      areas: Area[]; // Adicionando areas à sessão
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
    areas: Area[]; // Adicionando areas ao usuário
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: string;
    areas: Area[]; // Adicionando areas ao token
  }
}
