import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const client = globalThis.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = client;
}

client.$use(async (params, next) => {
  if (
    (params.action === 'create' || params.action === 'update' || params.action === 'upsert') &&
    params.model === 'Todo'
  ) {
    const data = params.args.data;

    if (data && typeof data.deadline === 'number') {
      params.args.data.deadline = new Date(data.deadline);
    }
  }

  return next(params);
});

export default client;