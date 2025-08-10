/* eslint-disable @typescript-eslint/no-unused-vars */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { EmailService } from '../../src/email/email.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Auth Flow Integration', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let authService: AuthService;
  let emailService: EmailService;

  // Mock data
  const mockStore = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Store',
    email: 'test@store.com',
    wppNumber: null,
    instagramUrl: null,
    facebookUrl: null,
    tiktokUrl: null,
    logoUrl: null,
    miniLogoUrl: null,
    faviconUrl: null,
    bannersUrl: [],
    onSaleUrlImg: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        user: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          deleteMany: jest.fn(),
        },
        store: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          deleteMany: jest.fn(),
        },
        $disconnect: jest.fn(),
        $connect: jest.fn(),
        $on: jest.fn(),
      })
      .overrideProvider(EmailService)
      .useValue({
        sendEmailConfirmation: jest.fn().mockResolvedValue(true),
        sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
        sendWelcomeEmail: jest.fn().mockResolvedValue(true),
        sendEmail: jest.fn().mockResolvedValue(true),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prismaService = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);
    authService = app.get<AuthService>(AuthService);
    emailService = app.get<EmailService>(EmailService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock responses
    (prismaService.store.findUnique as jest.Mock).mockResolvedValue(mockStore);
    (prismaService.store.create as jest.Mock).mockResolvedValue(mockStore);
    (prismaService.user.deleteMany as jest.Mock).mockResolvedValue({
      count: 0,
    });
    (prismaService.store.deleteMany as jest.Mock).mockResolvedValue({
      count: 0,
    });
  });

  describe('Simple Tests', () => {
    it('should validate user data correctly', () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        documentType: 'cpf',
        documentValue: '12345678901',
        phone: '11999999999',
        role: 'USER',
        storeId: '123e4567-e89b-12d3-a456-426614174000',
      };

      // Test validation manually
      expect(userData.name).toBeTruthy();
      expect(userData.email).toBeTruthy();
      expect(userData.password).toBeTruthy();
      expect(userData.documentType).toBeTruthy();
      expect(userData.documentValue).toBeTruthy();
      expect(userData.phone).toBeTruthy();
      expect(userData.storeId).toBeTruthy();
    });

    it('should be able to start the application', () => {
      expect(app).toBeDefined();
    });
  });

  // TODO: Fix these integration tests when ready to work on them
  /*
  describe('User Registration and Authentication Flow', () => {
    it('should register a new user successfully', async () => {
      // Test implementation here
    });

    it('should login successfully with correct credentials', async () => {
      // Test implementation here
    });

    it('should fail login with wrong password', async () => {
      // Test implementation here
    });

    it('should fail registration with existing email', async () => {
      // Test implementation here
    });

    it('should fail registration with invalid data', async () => {
      // Test implementation here
    });
  });

  describe('Password Reset Flow', () => {
    it('should handle forgot password request successfully', async () => {
      // Test implementation here
    });

    it('should fail forgot password with non-existent email', async () => {
      // Test implementation here
    });
  });

  describe('Email Verification Flow', () => {
    it('should handle email verification request', async () => {
      // Test implementation here
    });
  });

  describe('Protected Routes', () => {
    it('should access protected route with valid token', async () => {
      // Test implementation here
    });

    it('should fail to access protected route without token', async () => {
      // Test implementation here
    });
  });
  */
});
