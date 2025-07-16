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

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user.password) {
          console.error("Usuário não encontrado ou sem senha definida");
          return null; // Usuário não encontrado ou não tem senha configurada
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          console.error("Senha inválida");
          return null; // Senha incorreta
        }

        console.log("Autorização bem-sucedida para:", user.email);
        // Retorna o objeto do usuário sem a senha
        // O tipo User do NextAuth pode precisar ser estendido para incluir 'role'
        // em um arquivo d.ts, ex: src/types/next-auth.d.ts
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          // @ts-ignore
          role: user.role, // Adicionar role aqui
          // @ts-ignore
          areaIds: user.areaIds,
        } as User; // O tipo User aqui é o do next-auth, pode ser necessário ajustar
      },
    }),
  ],
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // O objeto 'user' aqui é o retornado pela função 'authorize'
      // e já deve conter o campo 'role'
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
        // @ts-ignore // NextAuth tipicamente infere isso, mas podemos ser explícitos
        token.role = user.role; // Adicionar role ao token
        // @ts-ignore
        token.areaIds = user.areaIds;
      }
      return token;
    },
    async session({ session, token }) {
      // Adiciona informações do token JWT para o objeto de sessão
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.image as string;
        // @ts-ignore // Similar ao JWT, para popular o objeto session.user
        session.user.role = token.role; // Adicionar role à sessão
        // @ts-ignore
        session.user.areaIds = token.areaIds;
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      // Permite redirecionamento relativo após o login
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Permite redirecionamento para outros domínios
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  pages: {
    signIn: '/login', // Especifica a página de login customizada (será criada/ajustada depois)
    // signOut: '/auth/signout',
    // error: '/auth/error', // Página para exibir erros (e.g. falha no login)
    // verifyRequest: '/auth/verify-request', // (e.g. para email/senhaless login)
    // newUser: null // Define como null para desabilitar registro de novos usuários
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const getAuthSession = () => getServerSession(authOptions);

