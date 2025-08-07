import { Test, TestingModule } from '@nestjs/testing';
import { UserCleanupService } from '../user-cleanup.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UserCleanupService', () => {
  let service: UserCleanupService;
  let prismaService: any;

  const mockUnverifiedUsers = [
    {
      id: 'user-1',
      email: 'user1@example.com',
      name: 'User One',
      createdAt: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: 'user-2',
      email: 'user2@example.com',
      name: 'User Two',
      createdAt: new Date('2024-01-01T11:00:00Z'),
    },
  ];

  const mockDeleteResult = {
    count: 2,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCleanupService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserCleanupService>(UserCleanupService);
    prismaService = module.get(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cleanupUnverifiedUsers', () => {
    it('should cleanup unverified users successfully', async () => {
      const now = new Date('2024-01-02T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      prismaService.user.findMany.mockResolvedValue(mockUnverifiedUsers);
      prismaService.user.deleteMany.mockResolvedValue(mockDeleteResult);

      await service.cleanupUnverifiedUsers();

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          emailVerified: false,
          emailConfirmationExpires: {
            lt: now,
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      expect(prismaService.user.deleteMany).toHaveBeenCalledWith({
        where: {
          emailVerified: false,
          emailConfirmationExpires: {
            lt: now,
          },
        },
      });
    });

    it('should handle case when no unverified users found', async () => {
      const now = new Date('2024-01-02T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      prismaService.user.findMany.mockResolvedValue([]);

      await service.cleanupUnverifiedUsers();

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          emailVerified: false,
          emailConfirmationExpires: {
            lt: now,
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      // Should not call deleteMany when no users found
      expect(prismaService.user.deleteMany).not.toHaveBeenCalled();
    });



    it('should handle single user cleanup', async () => {
      const now = new Date('2024-01-02T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      const singleUser = [mockUnverifiedUsers[0]];
      prismaService.user.findMany.mockResolvedValue(singleUser);
      prismaService.user.deleteMany.mockResolvedValue({ count: 1 });

      await service.cleanupUnverifiedUsers();

      expect(prismaService.user.findMany).toHaveBeenCalled();
      expect(prismaService.user.deleteMany).toHaveBeenCalled();
    });
  });

  describe('manualCleanup', () => {
    it('should trigger manual cleanup successfully', async () => {
      const now = new Date('2024-01-02T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      prismaService.user.findMany.mockResolvedValue(mockUnverifiedUsers);
      prismaService.user.deleteMany.mockResolvedValue(mockDeleteResult);

      await service.manualCleanup();

      expect(prismaService.user.findMany).toHaveBeenCalled();
      expect(prismaService.user.deleteMany).toHaveBeenCalled();
    });

    it('should handle manual cleanup with no users', async () => {
      const now = new Date('2024-01-02T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      prismaService.user.findMany.mockResolvedValue([]);

      await service.manualCleanup();

      expect(prismaService.user.findMany).toHaveBeenCalled();
      expect(prismaService.user.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle users with null or undefined values', async () => {
      const now = new Date('2024-01-02T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      const usersWithNullValues = [
        {
          id: 'user-1',
          email: null,
          name: 'User One',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          name: null,
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      ];

      prismaService.user.findMany.mockResolvedValue(usersWithNullValues);
      prismaService.user.deleteMany.mockResolvedValue({ count: 2 });

      await service.cleanupUnverifiedUsers();

      expect(prismaService.user.findMany).toHaveBeenCalled();
      expect(prismaService.user.deleteMany).toHaveBeenCalled();
    });

    it('should handle very old users', async () => {
      const now = new Date('2024-01-02T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      const oldUsers = [
        {
          id: 'old-user',
          email: 'old@example.com',
          name: 'Old User',
          createdAt: new Date('2023-01-01T00:00:00Z'), // Very old
        },
      ];

      prismaService.user.findMany.mockResolvedValue(oldUsers);
      prismaService.user.deleteMany.mockResolvedValue({ count: 1 });

      await service.cleanupUnverifiedUsers();

      expect(prismaService.user.findMany).toHaveBeenCalled();
      expect(prismaService.user.deleteMany).toHaveBeenCalled();
    });
  });
});
