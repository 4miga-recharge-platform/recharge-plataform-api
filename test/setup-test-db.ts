import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function setupTestDatabase() {
  try {
    // Limpa todas as tabelas
    await prisma.orderItem.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.recharge.deleteMany();
    await prisma.packageInfo.deleteMany();
    await prisma.paymentMethod.deleteMany();
    await prisma.package.deleteMany();
    await prisma.product.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    await prisma.store.deleteMany();

    console.log('Test database cleaned successfully');
  } catch (error) {
    console.error('Error cleaning test database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  setupTestDatabase()
    .then(() => {
      console.log('Test database setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test database setup failed:', error);
      process.exit(1);
    });
}

export { setupTestDatabase };
