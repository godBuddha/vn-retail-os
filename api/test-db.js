const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } });
  console.log('Settings:', settings);
  const logs = await prisma.emailLog.findMany({ orderBy: { createdAt: 'desc' }, take: 2 });
  console.log('Recent Logs:', logs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
