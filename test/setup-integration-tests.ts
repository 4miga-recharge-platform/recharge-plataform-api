import { config } from 'dotenv';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { DatabaseHelper } from './helpers/database.helper';

// Carrega as variáveis de ambiente do arquivo test.env
config({ path: resolve(__dirname, '../test.env') });

// Global Prisma instance for test database
let prisma: PrismaClient | undefined;
let pool: Pool | undefined;
let dbHelper: DatabaseHelper | undefined;

// Configurações globais para testes de integração
beforeAll(async () => {
  // Garante que as variáveis de ambiente estão carregadas
  expect(process.env.DATABASE_URL).toBeDefined();
  expect(process.env.JWT_SECRET).toBeDefined();

  // Setup database connection
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({
    adapter,
  });

  // Run migrations on test database
  try {
    console.log('Running migrations on test database...');
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
    });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  }

  // Connect to database
  await prisma.$connect();

  // Create database helper instance
  dbHelper = new DatabaseHelper(prisma);
});

afterAll(async () => {
  // Disconnect from database
  if (prisma) {
    await prisma.$disconnect();
  }
  if (pool) {
    await pool.end();
  }
});

// Cleanup database between tests
beforeEach(async () => {
  if (prisma) {
    // Delete in correct order to respect foreign key constraints
    // Start with tables that have foreign keys to others
    await prisma.couponUsage.deleteMany();
    await prisma.bigoRecharge.deleteMany();
    // Order must be deleted before OrderItem (Order has FK to OrderItem)
    await prisma.order.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.recharge.deleteMany();
    await prisma.packageInfo.deleteMany();
    await prisma.paymentMethod.deleteMany();
    await prisma.package.deleteMany();
    await prisma.product.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.influencerMonthlySales.deleteMany();
    await prisma.influencer.deleteMany();
    await prisma.storeMonthlySalesByProduct.deleteMany();
    await prisma.storeMonthlySales.deleteMany();
    await prisma.storeDailySales.deleteMany();
    await prisma.storeProductSettings.deleteMany();
    await prisma.user.deleteMany();
    await prisma.store.deleteMany();
  }
});

// Export prisma instance and database helper for use in tests
// Using getters to ensure they're initialized
export const getPrisma = () => {
  if (!prisma) {
    throw new Error('Prisma client not initialized. Make sure beforeAll has run.');
  }
  return prisma;
};

export const getDbHelper = () => {
  if (!dbHelper) {
    throw new Error('Database helper not initialized. Make sure beforeAll has run.');
  }
  return dbHelper;
};

// Export for backward compatibility (but will be undefined until beforeAll runs)
export { prisma, dbHelper };
