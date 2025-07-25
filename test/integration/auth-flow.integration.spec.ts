import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ValidationPipe } from '@nestjs/common';

describe('Auth Flow Integration', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(PrismaService)
    .useValue({
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      $disconnect: jest.fn(),
    })
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    prismaService = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('User Registration and Authentication Flow', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        documentType: 'cpf',
        documentValue: '12345678901',
        phone: '11999999999',
        role: 'USER',
        storeId: 'test-store-id'
      };

      const mockUser = {
        id: '1',
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        documentType: userData.documentType,
        documentValue: userData.documentValue,
        role: userData.role,
        storeId: userData.storeId,
        isEmailVerified: false,
        emailVerificationToken: 'token123',
        passwordResetToken: null,
        passwordResetExpires: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock Prisma responses
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(mockUser);

      // Register user
      const registerResponse = await request(app.getHttpServer())
        .post('/user')
        .send(userData)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('id');
      expect(registerResponse.body.email).toBe(userData.email);
      expect(registerResponse.body.name).toBe(userData.name);
      expect(registerResponse.body).not.toHaveProperty('password');
    });

    it('should fail login with wrong password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test2@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        documentType: 'cpf',
        documentValue: '12345678902',
        phone: '11999999998',
        role: 'USER',
        storeId: 'test-store-id'
      };

      const mockUser = {
        id: '2',
        ...userData,
        password: 'hashedPassword',
        isEmailVerified: false,
        emailVerificationToken: 'token123',
        passwordResetToken: null,
        passwordResetExpires: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock Prisma responses
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Register user
      await request(app.getHttpServer())
        .post('/user')
        .send(userData)
        .expect(201);

      // Try to login with wrong password
      const loginData = {
        email: userData.email,
        password: 'wrongpassword'
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('should fail registration with existing email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        documentType: 'cpf',
        documentValue: '12345678901',
        phone: '11999999999',
        role: 'USER',
        storeId: 'test-store-id'
      };

      const mockUser = {
        id: '1',
        ...userData,
        password: 'hashedPassword',
        isEmailVerified: false,
        emailVerificationToken: 'token123',
        passwordResetToken: null,
        passwordResetExpires: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock Prisma responses - first call returns null (user doesn't exist), second call returns user (user exists)
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);
      (prismaService.user.create as jest.Mock).mockResolvedValue(mockUser);

      // Register first user
      await request(app.getHttpServer())
        .post('/user')
        .send(userData)
        .expect(201);

      // Try to register with same email
      await request(app.getHttpServer())
        .post('/user')
        .send(userData)
        .expect(400);
    });
  });

  describe('Password Reset Flow', () => {
    it('should handle forgot password and reset password flow', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        documentType: 'cpf',
        documentValue: '12345678901',
        phone: '11999999999',
        role: 'USER',
        storeId: 'test-store-id'
      };

      const mockUser = {
        id: '1',
        ...userData,
        password: 'hashedPassword',
        isEmailVerified: false,
        emailVerificationToken: 'token123',
        passwordResetToken: null,
        passwordResetExpires: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock Prisma responses
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        passwordResetToken: 'reset-token-123',
        passwordResetExpires: new Date(Date.now() + 3600000) // 1 hour from now
      });

      // Register user
      await request(app.getHttpServer())
        .post('/user')
        .send(userData)
        .expect(201);

      // Request password reset
      const forgotPasswordData = {
        email: userData.email
      };

      const forgotResponse = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send(forgotPasswordData)
        .expect(200);

      expect(forgotResponse.body).toHaveProperty('message');
      expect(forgotResponse.body.message).toContain('Password reset email sent');

      // Note: In a real test, you would need to extract the reset code from the email
      // For integration tests, we'll just verify the flow works
    });
  });
});
