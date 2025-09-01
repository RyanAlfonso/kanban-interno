import { DefaultSession, User } from "next-auth";
import { JWT as NextAuthJWT } from "next-auth/jwt";

enum Role {
  USER = "USER",
  ADMIN = "ADMIN",
}

declare module "next-auth" {
  interface User {
    role?: Role;
  }

  interface Session extends DefaultSession {
    user?: User & {
      id: string;
      role?: Role;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends NextAuthJWT {
    role?: Role;
    id?: string;
  }
}
