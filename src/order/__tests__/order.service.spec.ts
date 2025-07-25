import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, RechargeStatus } from '@prisma/client';
import { OrderService } from '../order.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from '../dto/create-order.dto';

// Mock validation utility
jest.mock('../../utils/validation.util', () => ({
  validateRequiredFields: jest.fn(),
}));

describe('OrderService', () => {
  let service: OrderService;
  let prismaService: any;

  const mockUser = {
    id: 'user-123',
    storeId: 'store-123',
    email: 'user@example.com',
    name: 'John Doe',
  };

  const mockPackage = {
    id: 'package-123',
    name: 'Premium Package',
    amountCredits: 100,
    imgCardUrl: 'https://example.com/package-card.png',
    storeId: 'store-123',
    productId: 'product-123',
    product: {
      id: 'product-123',
      name: 'Mobile Recharge',
    },
    paymentMethods: [
      {
        id: 'payment-method-123',
        name: 'pix',
        price: 19.99,
      },
    ],
  };

  const mockOrder = {
    id: 'order-123',
    orderNumber: '123456789012',
    price: 19.99,
    orderStatus: OrderStatus.CREATED,
    storeId: 'store-123',
    userId: 'user-123',
    paymentId: 'payment-123',
    orderItemId: 'order-item-123',
    createdAt: new Date(),
    payment: {
      id: 'payment-123',
      name: 'pix',
      status: PaymentStatus.PAYMENT_PENDING,
      qrCode: 'qrcode19.99',
      qrCodetextCopyPaste: 'qrcode-copypaste19.99',
    },
    orderItem: {
      id: 'order-item-123',
      productId: 'product-123',
      productName: 'Mobile Recharge',
      packageId: 'package-info-123',
      rechargeId: 'recharge-123',
      recharge: {
        id: 'recharge-123',
        userIdForRecharge: 'player123456',
        status: RechargeStatus.RECHARGE_PENDING,
        amountCredits: 100,
      },
      package: {
        id: 'package-info-123',
        packageId: 'package-123',
        name: 'Premium Package',
        userIdForRecharge: 'player123456',
        imgCardUrl: 'https://example.com/package-card.png',
      },
    },
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findFirst: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      package: {
        findUnique: jest.fn(),
      },
      packageInfo: {
        create: jest.fn(),
      },
      recharge: {
        create: jest.fn(),
      },
      orderItem: {
        create: jest.fn(),
      },
      payment: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    const storeId = 'store-123';
    const userId = 'user-123';
    const page = 1;
    const limit = 6;

    it('should return paginated orders successfully', async () => {
      const orders = [mockOrder];
      const totalOrders = 1;

      prismaService.user.findFirst.mockResolvedValue(mockUser);
      prismaService.order.findMany.mockResolvedValue(orders);
      prismaService.order.count.mockResolvedValue(totalOrders);

      const result = await service.findAll(storeId, userId, page, limit);

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: userId,
          storeId,
        },
      });

      expect(prismaService.order.findMany).toHaveBeenCalledWith({
        where: {
          storeId: mockUser.storeId,
          userId,
        },
        include: {
          payment: true,
          orderItem: {
            include: {
              recharge: true,
              package: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      expect(prismaService.order.count).toHaveBeenCalledWith({
        where: {
          storeId: mockUser.storeId,
          userId,
        },
      });

      expect(result).toEqual({
        data: orders,
        totalOrders,
        page,
        totalPages: 1,
      });
    });

    it('should throw ForbiddenException when user does not belong to store', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.findAll(storeId, userId, page, limit)).rejects.toThrow(
        new ForbiddenException('User does not belong to this store'),
      );
    });

    it('should handle database errors', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockUser);
      prismaService.order.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll(storeId, userId, page, limit)).rejects.toThrow('Database error');
    });
  });

  describe('findOne', () => {
    const orderId = 'order-123';
    const userId = 'user-123';

    it('should return an order successfully', async () => {
      prismaService.order.findFirst.mockResolvedValue(mockOrder);

      const result = await service.findOne(orderId, userId);

      expect(prismaService.order.findFirst).toHaveBeenCalledWith({
        where: {
          id: orderId,
          userId,
        },
        include: {
          payment: true,
          orderItem: {
            include: {
              recharge: true,
              package: true,
            },
          },
        },
      });

      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException when order not found', async () => {
      prismaService.order.findFirst.mockResolvedValue(null);

      await expect(service.findOne(orderId, userId)).rejects.toThrow(
        new NotFoundException('Order not found'),
      );
    });

    it('should handle database errors', async () => {
      prismaService.order.findFirst.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne(orderId, userId)).rejects.toThrow('Database error');
    });
  });

  describe('create', () => {
    const createOrderDto: CreateOrderDto = {
      storeId: 'store-123',
      packageId: 'package-123',
      paymentMethodId: 'payment-method-123',
      userIdForRecharge: 'player123456',
    };
    const userId = 'user-123';

    it('should create an order successfully', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          packageInfo: {
            create: jest.fn().mockResolvedValue({
              id: 'package-info-123',
              packageId: mockPackage.id,
              name: mockPackage.name,
              userIdForRecharge: createOrderDto.userIdForRecharge,
              imgCardUrl: mockPackage.imgCardUrl,
            }),
          },
          recharge: {
            create: jest.fn().mockResolvedValue({
              id: 'recharge-123',
              userIdForRecharge: createOrderDto.userIdForRecharge,
              status: RechargeStatus.RECHARGE_PENDING,
              amountCredits: mockPackage.amountCredits,
            }),
          },
          orderItem: {
            create: jest.fn().mockResolvedValue({
              id: 'order-item-123',
              productId: mockPackage.productId,
              productName: mockPackage.product.name,
              packageId: 'package-info-123',
              rechargeId: 'recharge-123',
            }),
          },
          payment: {
            create: jest.fn().mockResolvedValue({
              id: 'payment-123',
              name: mockPackage.paymentMethods[0].name,
              status: PaymentStatus.PAYMENT_PENDING,
              qrCode: 'qrcode19.99',
              qrCodetextCopyPaste: 'qrcode-copypaste19.99',
            }),
          },
          order: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockOrder),
          },
        };
        return await callback(tx);
      });

      prismaService.user.findFirst.mockResolvedValue(mockUser);
      prismaService.package.findUnique.mockResolvedValue(mockPackage);
      prismaService.$transaction.mockImplementation(mockTransaction);

      const result = await service.create(createOrderDto, userId);

      expect(validateRequiredFields).toHaveBeenCalledWith(createOrderDto, [
        'storeId',
        'packageId',
        'paymentMethodId',
        'userIdForRecharge',
      ]);

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: userId,
          storeId: createOrderDto.storeId,
        },
      });

      expect(prismaService.package.findUnique).toHaveBeenCalledWith({
        where: { id: createOrderDto.packageId },
        include: {
          product: true,
          paymentMethods: {
            where: {
              id: createOrderDto.paymentMethodId,
            },
          },
        },
      });

      expect(result).toEqual(mockOrder);
    });

    it('should throw ForbiddenException when user does not belong to store', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      prismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.create(createOrderDto, userId)).rejects.toThrow(
        new ForbiddenException('User does not belong to this store'),
      );
    });

    it('should throw NotFoundException when package not found', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      prismaService.user.findFirst.mockResolvedValue(mockUser);
      prismaService.package.findUnique.mockResolvedValue(null);

      await expect(service.create(createOrderDto, userId)).rejects.toThrow(
        new NotFoundException('Package not found'),
      );
    });

    it('should throw BadRequestException when package does not belong to store', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      const packageFromDifferentStore = { ...mockPackage, storeId: 'different-store-123' };

      prismaService.user.findFirst.mockResolvedValue(mockUser);
      prismaService.package.findUnique.mockResolvedValue(packageFromDifferentStore);

      await expect(service.create(createOrderDto, userId)).rejects.toThrow(
        new BadRequestException('Package does not belong to this store'),
      );
    });

    it('should throw NotFoundException when payment method not available', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      const packageWithoutPaymentMethods = { ...mockPackage, paymentMethods: [] };

      prismaService.user.findFirst.mockResolvedValue(mockUser);
      prismaService.package.findUnique.mockResolvedValue(packageWithoutPaymentMethods);

      await expect(service.create(createOrderDto, userId)).rejects.toThrow(
        new NotFoundException('Payment method not available for this package'),
      );
    });

    it('should handle database errors', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      prismaService.user.findFirst.mockResolvedValue(mockUser);
      prismaService.package.findUnique.mockResolvedValue(mockPackage);
      prismaService.$transaction.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createOrderDto, userId)).rejects.toThrow('Database error');
    });
  });
});
