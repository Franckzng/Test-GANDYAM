import { PrismaClient } from "@prisma/client";

// On crée une instance unique de Prisma
export const prisma = new PrismaClient();

// (Optionnel) : gérer la fermeture propre du client
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
