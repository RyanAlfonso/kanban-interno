import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient;
}

const client = globalThis.prismadb || new PrismaClient();
if (process.env.NODE_ENV === 'development') globalThis.prismadb = client;

export default client;
