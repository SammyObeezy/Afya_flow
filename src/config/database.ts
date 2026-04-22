/**
 * Prisma client singleton.
 * NOTE: Run `npm run prisma:generate` before starting the server.
 * The require is dynamic so TypeScript compiles without the generated client present.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaModule: any = require('@prisma/client');
// Handles both CJS default export shapes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PrismaClientCtor: new (opts?: any) => any =
  prismaModule.PrismaClient ?? prismaModule.default?.PrismaClient ?? prismaModule.default;

const prisma = new PrismaClientCtor({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export default prisma;
