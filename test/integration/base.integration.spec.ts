import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { BraviveService } from '../../src/bravive/bravive.service';
import { BraviveHttpService } from '../../src/bravive/http/bravive-http.service';
import { BigoService } from '../../src/bigo/bigo.service';
import { EmailService } from '../../src/email/email.service';
import { MetricsService } from '../../src/metrics/metrics.service';
import { OrderService } from '../../src/order/order.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { StoreService } from '../../src/store/store.service';
import { getPrisma } from '../setup-integration-tests';
import { BraviveMock } from '../helpers/mocks/bravive.mock';
import { BigoMock } from '../helpers/mocks/bigo.mock';
import { EmailMock } from '../helpers/mocks/email.mock';

/**
 * Base class for integration tests
 * Provides common setup, mocks, and helpers for integration tests
 */
export class BaseIntegrationTest {
  app: INestApplication;
  moduleFixture: TestingModule;
  prismaService: PrismaService;
  orderService: OrderService;
  storeService: StoreService;
  braviveService: BraviveService;
  bigoService: BigoService;
  emailService: EmailService;

  /**
   * Setup the NestJS application with mocks for external services
   */
  async setupApp() {
    // Create mock for BraviveHttpService (to avoid real HTTP calls)
    const mockBraviveHttpService = {
      post: jest.fn().mockResolvedValue(BraviveMock.createPaymentResponse()),
      get: jest.fn(),
    };

    // Create mock for BigoService
    const mockBigoService = {
      rechargePrecheck: jest.fn().mockResolvedValue(BigoMock.createPrecheckSuccess()),
      diamondRecharge: jest.fn().mockResolvedValue(BigoMock.createRechargeSuccess()),
      disableRecharge: jest.fn(),
      getRechargeLogs: jest.fn(),
      getRetryStats: jest.fn(),
    };

    // Create mock for EmailService
    const mockEmailService = EmailMock.createMockService();

    // Create mock for MetricsService
    const mockMetricsService = {
      updateMetricsForOrder: jest.fn().mockResolvedValue(undefined),
      recalculateStoreMetrics: jest.fn().mockResolvedValue(undefined),
    };

    // Create testing module
    this.moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrisma()) // Use real Prisma from setup-integration-tests
      .overrideProvider(BraviveHttpService)
      .useValue(mockBraviveHttpService) // Mock HTTP service, but keep BraviveService real
      .overrideProvider(BigoService)
      .useValue(mockBigoService)
      .overrideProvider(EmailService)
      .useValue(mockEmailService)
      .overrideProvider(MetricsService)
      .useValue(mockMetricsService)
      .compile();

    // Create NestJS application
    this.app = this.moduleFixture.createNestApplication();

    // Configure global validation pipe
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Initialize app
    await this.app.init();

    // Get services
    this.prismaService = this.app.get<PrismaService>(PrismaService);
    this.orderService = this.app.get<OrderService>(OrderService);
    this.storeService = this.app.get<StoreService>(StoreService);
    this.braviveService = this.app.get<BraviveService>(BraviveService);
    this.bigoService = this.app.get<BigoService>(BigoService);
    this.emailService = this.app.get<EmailService>(EmailService);
  }

  /**
   * Cleanup: close the application
   */
  async teardownApp() {
    if (this.app) {
      await this.app.close();
    }
  }

  /**
   * Reset all mocks before each test
   */
  resetMocks() {
    jest.clearAllMocks();

    // Reset BraviveHttpService mocks to default behavior
    const braviveHttpService = this.moduleFixture.get(BraviveHttpService);
    (braviveHttpService.post as jest.Mock).mockResolvedValue(
      BraviveMock.createPaymentResponse(),
    );

    // Reset BigoService mocks to default behavior
    (this.bigoService.rechargePrecheck as jest.Mock).mockResolvedValue(
      BigoMock.createPrecheckSuccess(),
    );
    (this.bigoService.diamondRecharge as jest.Mock).mockResolvedValue(
      BigoMock.createRechargeSuccess(),
    );
  }

  /**
   * Helper to get HTTP server for supertest requests
   */
  getHttpServer() {
    return this.app.getHttpServer();
  }
}

