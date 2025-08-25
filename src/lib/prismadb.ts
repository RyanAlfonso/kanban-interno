import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const client = globalThis.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = client;
}

const middleware = async ({ model, operation, args, query }) => {
  if (['create', 'update', 'upsert'].includes(operation)) {
    if (args.data && typeof args.data.deadline === 'number') {
      args.data.deadline = new Date(args.data.deadline);
    }
  }

  return query(args);
};

const extendedClient = client.$extends({
  query: {
    todo: {
      create: middleware,
      update: middleware,
      upsert: middleware,
    },
  },
});

export default extendedClient;
