import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const client = globalThis.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = client;
}

const middleware = async (params) => {
  const data = params.args.data;

        if (data && typeof data.deadline === 'number') {
          data.deadline = new Date(data.deadline);
        }

        return data;
};

const extendedClient = client.$extends({
  query:{
    todo: {
      create: middleware,
      update: middleware,
      upsert: middleware,
    }
  }
});

export default extendedClient;