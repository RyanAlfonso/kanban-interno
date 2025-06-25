import { DefaultSession, User } from "next-auth";

// nextauth.d.ts
declare module "next-auth" {
  interface Session extends DefaultSession {
    user?: User & {
      id: string;
    };
  }
}
