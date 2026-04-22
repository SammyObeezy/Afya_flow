// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CONDITIONS = ['HIV', 'TB', 'Hypertension', 'Malaria', 'Typhoid', 'Diabetes', 'Other'] as const;

async function main() {
  console.log('Seeding conditions...');
  for (const conditionName of CONDITIONS) {
    await prisma.condition.upsert({
      where: { name: conditionName },
      update: {},
      create: { name: conditionName },
    });
  }

  console.log('Seeding roles...');
  const roles = ['admin', 'health_worker'] as const;
  for (const roleName of roles) {
    await prisma.role_Table.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }

  console.log('✅ Seed completed successfully.');
}

main()
  .catch((e: Error) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
