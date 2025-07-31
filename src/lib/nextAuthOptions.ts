// Caminho: src/lib/nextAuthOptions.ts (ou similar)

import prisma from "@/lib/prismadb";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions, User, getServerSession } from "next-auth";
import { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "jsmith@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          console.error("Credenciais ausentes");
          return null;
        }

        // 1. Garanta que 'type' seja incluído na busca do usuário
        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
          include: {
            areas: true,
          },
        });

        if (!user || !user.password) {
          console.error("Usuário não encontrado ou sem senha definida");
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          console.error("Senha inválida");
          return null;
        }

        console.log("Autorização bem-sucedida para:", user.email);
        
        // 2. Retorne o objeto completo do usuário, incluindo 'type'
        //    O 'as User' funcionará corretamente com o arquivo next-auth.d.ts atualizado.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          type: user.type, // <<-- ADICIONADO
          areas: user.areas,
        };
      },
    }),
  ],
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // O objeto 'user' aqui é o que foi retornado pela função 'authorize'
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.type = user.type; // <<-- ADICIONADO
        token.areas = user.areas;
        // Os campos padrão (name, email, image) já são tratados pelo NextAuth
      }
      return token;
    },
    async session({ session, token }) {
      // O objeto 'token' aqui é o que foi retornado pela função 'jwt'
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.type = token.type; // <<-- ADICIONADO
        session.user.areas = token.areas;
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const getAuthSession = () => getServerSession(authOptions);
