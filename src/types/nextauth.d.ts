import { DefaultSession, User } from "next-auth";
import { JWT as NextAuthJWT } from "next-auth/jwt"; // Importação adicionada

// Define o enum Role, idealmente importado do prisma se possível, ou redefinido aqui.
// Para simplificar, vamos redefinir aqui. Certifique-se que corresponde ao schema.prisma.
enum Role {
  USER = "USER",
  ADMIN = "ADMIN",
}

declare module "next-auth" {
  interface User {
    // Adiciona o campo role ao tipo User padrão do NextAuth
    // Este User é o que vem da função authorize e é passado para o callback jwt
    role?: Role; // Ou string, se preferir não usar o enum diretamente aqui
    areaIds?: string[];
  }

  interface Session extends DefaultSession {
    user?: User & { // User aqui já estaria estendido acima
      id: string;
      role?: Role; // Adiciona role ao user dentro da Session
      areaIds?: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends NextAuthJWT {
    // Adiciona role ao token JWT
    role?: Role;
    areaIds?: string[];
    // id, email, name, image já são esperados no token se passados no callback jwt
    id?: string;
  }
}
