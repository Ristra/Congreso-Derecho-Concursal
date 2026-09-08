import { PrismaClient } from '@prisma/client'

// ELIMINAMOS cualquier configuración dentro de los paréntesis.
// Al estar vacío, Prisma leerá obligatoriamente la URL del schema.prisma
const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma