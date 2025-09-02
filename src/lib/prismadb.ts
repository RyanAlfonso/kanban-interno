import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const client = globalThis.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = client;
}

// Middleware aprimorado e mais seguro
const middleware = async ({ args, query }) => {
  // Verifica se 'args.data' existe e se 'deadline' está presente e é um número.
  // Usamos 'hasOwnProperty' para ter certeza que a propriedade pertence ao objeto.
  if (args.data && 
      Object.prototype.hasOwnProperty.call(args.data, 'deadline') && 
      typeof args.data.deadline === 'number') {
    
    // Clona os dados para evitar mutações inesperadas no objeto original
    const newData = { ...args.data };
    
    // Converte o timestamp para um objeto Date
    newData.deadline = new Date(newData.deadline);
    
    // Executa a query com os dados modificados
    return query({ ...args, data: newData });
  }

  // Para qualquer outra operação que não se encaixe na condição acima
  // (ex: mover o card, que não mexe no deadline),
  // apenas executa a query original sem modificações.
  return query(args);
};

const extendedClient = client.$extends({
  query: {
    todo: {
      // Aplica o middleware para as operações de criação e atualização
      create: middleware,
      update: middleware,
      upsert: middleware,
    },
  },
});

export default extendedClient;
