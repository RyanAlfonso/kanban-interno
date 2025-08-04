
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";
import { Area, Role, UserType } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role; 
      type: UserType;
      areas: Area[];
    } & DefaultSession["user"]; 
  }

  interface User extends DefaultUser {
    role: Role;
    type: UserType;
    areas: Area[];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: Role;
    type: UserType;
    areas: Area[];
  }
}
