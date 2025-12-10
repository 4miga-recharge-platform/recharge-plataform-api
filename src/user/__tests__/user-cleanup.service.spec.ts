import { Test, TestingModule } from '@nestjs/testing';
import { UserCleanupService } from '../user-cleanup.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../../order/order.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

describe('UserCleanupService', () => {
  let service: UserCleanupService;
  let prismaService: any;
  let orderService: any;

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

  const mockUnpaidOrders = [
    {
      id: 'order-1',
      orderNumber: 'ORD001',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      storeId: 'store-1',
    },
    {
      id: 'order-2',
      orderNumber: 'ORD002',
      createdAt: new Date('2024-01-01T11:00:00Z'),
      storeId: 'store-1',
    },
  ];

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockOrderService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCleanupService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
      ],
    }).compile();

    service = module.get<UserCleanupService>(UserCleanupService);
    prismaService = module.get(PrismaService);
    orderService = module.get(OrderService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('cleanupUnverifiedUsers', () => {
    it('should cleanup unverified users successfully', async () => {
      const now = new Date('2024-01-02T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      prismaService.user.findMany.mockResolvedValue(mockUnverifiedUsers);
      prismaService.user.deleteMany.mockResolvedValue(mockDeleteResult);
      prismaService.order.findMany.mockResolvedValue([]);

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
      jest.useFakeTimers();
      jest.setSystemTime(now);

      prismaService.user.findMany.mockResolvedValue([]);
      prismaService.order.findMany.mockResolvedValue([]);

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
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const singleUser = [mockUnverifiedUsers[0]];
      prismaService.user.findMany.mockResolvedValue(singleUser);
      prismaService.user.deleteMany.mockResolvedValue({ count: 1 });
      prismaService.order.findMany.mockResolvedValue([]);

      await service.cleanupUnverifiedUsers();

      expect(prismaService.user.findMany).toHaveBeenCalled();
      expect(prismaService.user.deleteMany).toHaveBeenCalled();
    });
  });

  describe('manualCleanup', () => {
    it('should trigger manual cleanup successfully', async () => {
      const now = new Date('2024-01-02T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      prismaService.user.findMany.mockResolvedValue(mockUnverifiedUsers);
      prismaService.user.deleteMany.mockResolvedValue(mockDeleteResult);
      prismaService.order.findMany.mockResolvedValue([]);

      await service.manualCleanup();

      expect(prismaService.user.findMany).toHaveBeenCalled();
      expect(prismaService.user.deleteMany).toHaveBeenCalled();
    });

    it('should handle manual cleanup with no users', async () => {
      const now = new Date('2024-01-02T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      prismaService.user.findMany.mockResolvedValue([]);
      prismaService.order.findMany.mockResolvedValue([]);

      await service.manualCleanup();

      expect(prismaService.user.findMany).toHaveBeenCalled();
      expect(prismaService.user.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle users with null or undefined values', async () => {
      const now = new Date('2024-01-02T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

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
      prismaService.order.findMany.mockResolvedValue([]);

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
      prismaService.order.findMany.mockResolvedValue([]);

      await service.cleanupUnverifiedUsers();

      expect(prismaService.user.findMany).toHaveBeenCalled();
      expect(prismaService.user.deleteMany).toHaveBeenCalled();
    });
  });

  describe('expireUnpaidOrders', () => {
    it('should expire unpaid orders successfully', async () => {
      jest.useFakeTimers();
      const now = new Date('2024-01-02T12:00:00Z');
      jest.setSystemTime(now);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      prismaService.order.findMany.mockResolvedValue(mockUnpaidOrders);
      prismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          order: {
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      await service.expireUnpaidOrders();

      expect(prismaService.order.findMany).toHaveBeenCalledWith({
        where: {
          orderStatus: {
            in: [OrderStatus.CREATED, OrderStatus.PROCESSING],
          },
          payment: {
            status: PaymentStatus.PAYMENT_PENDING,
          },
          createdAt: {
            lt: twentyFourHoursAgo,
          },
        },
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          storeId: true,
        },
      });

      expect(prismaService.$transaction).toHaveBeenCalledTimes(2);
    });

    it('should handle case when no unpaid orders found', async () => {
      jest.useFakeTimers();
      const now = new Date('2024-01-02T12:00:00Z');
      jest.setSystemTime(now);

      prismaService.order.findMany.mockResolvedValue([]);

      await service.expireUnpaidOrders();

      expect(prismaService.order.findMany).toHaveBeenCalled();
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should handle errors when expiring individual orders', async () => {
      jest.useFakeTimers();
      const now = new Date('2024-01-02T12:00:00Z');
      jest.setSystemTime(now);

      prismaService.order.findMany.mockResolvedValue(mockUnpaidOrders);
      // First order succeeds, second fails
      let callCount = 0;
      prismaService.$transaction.mockImplementation(async (callback) => {
        callCount++;
        if (callCount === 1) {
          const mockTx = {
            order: {
              update: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(mockTx);
        } else {
          throw new Error('Transaction failed');
        }
      });
      await service.expireUnpaidOrders();

      expect(prismaService.$transaction).toHaveBeenCalledTimes(2);
      // First order should have succeeded
    });

    it('should handle single unpaid order', async () => {
      jest.useFakeTimers();
      const now = new Date('2024-01-02T12:00:00Z');
      jest.setSystemTime(now);

      const singleOrder = [mockUnpaidOrders[0]];
      prismaService.order.findMany.mockResolvedValue(singleOrder);
      prismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          order: {
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      await service.expireUnpaidOrders();

      expect(prismaService.order.findMany).toHaveBeenCalled();
      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('manualExpireOrders', () => {
    it('should trigger manual order expiration successfully', async () => {
      jest.useFakeTimers();
      const now = new Date('2024-01-02T12:00:00Z');
      jest.setSystemTime(now);

      prismaService.order.findMany.mockResolvedValue(mockUnpaidOrders);
      prismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          order: {
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      await service.manualExpireOrders();

      expect(prismaService.order.findMany).toHaveBeenCalled();
      expect(prismaService.$transaction).toHaveBeenCalled();
    });
  });
});
