import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentStatus, RechargeStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { ValidateCouponDto } from '../dto/validate-coupon.dto';
import { OrderService } from '../order.service';

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
    couponUsages: [],
  };

  const mockCoupon = {
    id: 'coupon-123',
    title: 'WELCOME10',
    discountPercentage: 10.0,
    discountAmount: null,
    expiresAt: new Date('2025-12-31'),
    timesUsed: 5,
    maxUses: 100,
    minOrderAmount: 10.0,
    isActive: true,
    isFirstPurchase: false,
    storeId: 'store-123',
    influencerId: 'influencer-123',
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
        findMany: jest.fn(),
      },
      packageInfo: {
        create: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      storeProductSettings: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
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
      coupon: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      couponUsage: {
        create: jest.fn(),
        update: jest.fn(),
      },
      influencerMonthlySales: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
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
    prismaService.storeProductSettings.findMany.mockResolvedValue([]);
    prismaService.product.findMany.mockResolvedValue([]);
    prismaService.package.findMany.mockResolvedValue([]);
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
      const orders = [{
        ...mockOrder,
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'user@example.com',
        },
        orderItem: {
          ...mockOrder.orderItem,
          package: {
            ...mockOrder.orderItem.package,
            imgCardUrl: 'snapshot-img',
          },
        },
        couponUsages: [],
      }];
      const totalOrders = 1;

      prismaService.user.findFirst.mockResolvedValue(mockUser);
      prismaService.order.findMany.mockResolvedValue(orders);
      prismaService.order.count.mockResolvedValue(totalOrders);
      prismaService.storeProductSettings.findMany.mockResolvedValue([
        { storeId, productId: mockOrder.orderItem.productId, imgCardUrl: 'store-custom-img' },
      ]);
      prismaService.product.findMany.mockResolvedValue([
        { id: mockOrder.orderItem.productId, imgCardUrl: 'default-product-img' },
      ]);
      prismaService.package.findMany.mockResolvedValue([
        {
          productId: mockOrder.orderItem.productId,
          product: { name: 'Sample Product' },
        },
      ]);

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
          couponUsages: {
            include: {
              coupon: {
                select: {
                  id: true,
                  title: true,
                  discountPercentage: true,
                  discountAmount: true,
                  isFirstPurchase: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
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

      expect(result.totalOrders).toBe(totalOrders);
      expect(result.page).toBe(page);
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].orderItem.package.imgCardUrl).toBe('store-custom-img');
      expect(result.products).toEqual([
        {
          id: mockOrder.orderItem.productId,
          name: 'Sample Product',
        },
      ]);
    });

    it('should throw ForbiddenException when user does not belong to store', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.findAll(storeId, userId, page, limit),
      ).rejects.toThrow(
        new ForbiddenException('User does not belong to this store'),
      );
    });

    it('should handle database errors', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockUser);
      prismaService.order.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.findAll(storeId, userId, page, limit),
      ).rejects.toThrow('Database error');
    });
  });

  describe('findOne', () => {
    const orderId = 'order-123';
    const userId = 'user-123';

    it('should return an order successfully', async () => {
      prismaService.order.findFirst.mockResolvedValue({
        ...mockOrder,
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'user@example.com',
        },
        orderItem: {
          ...mockOrder.orderItem,
          package: {
            ...mockOrder.orderItem.package,
            imgCardUrl: 'snapshot-img',
          },
        },
      });
      prismaService.storeProductSettings.findMany.mockResolvedValue([
        {
          storeId: mockOrder.storeId,
          productId: mockOrder.orderItem.productId,
          imgCardUrl: 'store-custom-img',
        },
      ]);
      prismaService.product.findMany.mockResolvedValue([
        {
          id: mockOrder.orderItem.productId,
          imgCardUrl: 'default-product-img',
        },
      ]);

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
          couponUsages: {
            include: {
              coupon: {
                select: {
                  id: true,
                  title: true,
                  discountPercentage: true,
                  discountAmount: true,
                  isFirstPurchase: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      expect(result.orderItem.package.imgCardUrl).toBe('store-custom-img');
    });

    it('should throw NotFoundException when order not found', async () => {
      prismaService.order.findFirst.mockResolvedValue(null);

      await expect(service.findOne(orderId, userId)).rejects.toThrow(
        new NotFoundException('Order not found'),
      );
    });

    it('should handle database errors', async () => {
      prismaService.order.findFirst.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findOne(orderId, userId)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('findAllByStore', () => {
    const storeId = 'store-123';
    const page = 2;
    const limit = 10;

    it('should return paginated store orders successfully', async () => {
      const orders = [{
        ...mockOrder,
        orderItem: {
          ...mockOrder.orderItem,
          package: {
            ...mockOrder.orderItem.package,
            imgCardUrl: 'snapshot-img',
          },
        },
        couponUsages: [],
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'user@example.com',
        },
      }];
      const totalOrders = 5;

      prismaService.order.findMany.mockResolvedValue(orders);
      prismaService.order.count.mockResolvedValue(totalOrders);
      prismaService.storeProductSettings.findMany.mockResolvedValue([
        { storeId, productId: mockOrder.orderItem.productId, imgCardUrl: 'store-custom-img' },
      ]);
      prismaService.product.findMany.mockResolvedValue([
        { id: mockOrder.orderItem.productId, imgCardUrl: 'default-product-img' },
      ]);
      prismaService.package.findMany.mockResolvedValue([
        {
          productId: mockOrder.orderItem.productId,
          product: { name: 'Sample Product' },
        },
      ]);

      const result = await service.findAllByStore(storeId, page, limit);

      const findManyArgs = prismaService.order.findMany.mock.calls[0][0];
      const countArgs = prismaService.order.count.mock.calls[0][0];
      const packageFindManyArgs = prismaService.package.findMany.mock.calls[0][0];

      expect(findManyArgs).toEqual(
        expect.objectContaining({
          where: { storeId },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      );

      expect(findManyArgs.include).toEqual(
        expect.objectContaining({
          payment: true,
          orderItem: expect.objectContaining({
            include: expect.objectContaining({
              recharge: true,
              package: true,
            }),
          }),
          couponUsages: expect.objectContaining({
            include: expect.objectContaining({
              coupon: expect.objectContaining({
                select: {
                  id: true,
                  title: true,
                  discountPercentage: true,
                  discountAmount: true,
                  isFirstPurchase: true,
                },
              }),
            }),
          }),
          user: expect.objectContaining({
            select: {
              id: true,
              name: true,
              email: true,
            },
          }),
        }),
      );

      expect(countArgs).toEqual({ where: { storeId } });

      expect(result.totalOrders).toBe(totalOrders);
      expect(result.page).toBe(page);
      expect(result.totalPages).toBe(Math.ceil(totalOrders / limit));
      expect(result.data).toHaveLength(1);
      expect(result.data[0].orderItem.package.imgCardUrl).toBe('store-custom-img');
      expect(result.products).toEqual([
        {
          id: mockOrder.orderItem.productId,
          name: 'Sample Product',
        },
      ]);
      expect(packageFindManyArgs).toEqual({
        where: {
          storeId,
          isActive: true,
        },
        select: {
          productId: true,
          product: {
            select: {
              name: true,
            },
          },
        },
      });
    });

    it('should apply search filters on order number and user email', async () => {
      prismaService.order.findMany.mockResolvedValue([]);
      prismaService.order.count.mockResolvedValue(0);
      prismaService.storeProductSettings.findMany.mockResolvedValue([]);
      prismaService.product.findMany.mockResolvedValue([]);

      await service.findAllByStore(storeId, page, limit, 'john', undefined);

      const findManyArgs = prismaService.order.findMany.mock.calls[0][0];
      expect(findManyArgs.where).toEqual({
        storeId,
        OR: [
          {
            orderNumber: {
              contains: 'john',
              mode: 'insensitive',
            },
          },
          {
            user: {
              email: {
                contains: 'john',
                mode: 'insensitive',
              },
            },
          },
        ],
      });
    });

    it('should apply order status filter when provided', async () => {
      prismaService.order.findMany.mockResolvedValue([]);
      prismaService.order.count.mockResolvedValue(0);
      prismaService.storeProductSettings.findMany.mockResolvedValue([]);
      prismaService.product.findMany.mockResolvedValue([]);

      await service.findAllByStore(storeId, page, limit, undefined, 'completed');

      const findManyArgs = prismaService.order.findMany.mock.calls[0][0];
      expect(findManyArgs.where).toEqual({
        storeId,
        orderStatus: 'COMPLETED',
      });
    });

    it('should apply product filter when provided', async () => {
      prismaService.order.findMany.mockResolvedValue([]);
      prismaService.order.count.mockResolvedValue(0);

      await service.findAllByStore(storeId, page, limit, undefined, undefined, 'product-123');

      const findManyArgs = prismaService.order.findMany.mock.calls[0][0];
      expect(findManyArgs.where).toEqual({
        storeId,
        orderItem: {
          is: {
            productId: 'product-123',
          },
        },
      });
    });

    it('should ignore status when value is "all" (case insensitive)', async () => {
      prismaService.order.findMany.mockResolvedValue([]);
      prismaService.order.count.mockResolvedValue(0);

      await service.findAllByStore(storeId, page, limit, undefined, 'All');

      const findManyArgs = prismaService.order.findMany.mock.calls[0][0];
      expect(findManyArgs.where).toEqual({ storeId });
    });

    it('should normalize status value before applying filter', async () => {
      prismaService.order.findMany.mockResolvedValue([]);
      prismaService.order.count.mockResolvedValue(0);

      await service.findAllByStore(storeId, page, limit, undefined, '   processing   ');

      const findManyArgs = prismaService.order.findMany.mock.calls[0][0];
      expect(findManyArgs.where).toEqual({
        storeId,
        orderStatus: 'PROCESSING',
      });
    });

    it('should ignore empty search and status', async () => {
      prismaService.order.findMany.mockResolvedValue([]);
      prismaService.order.count.mockResolvedValue(0);
      prismaService.storeProductSettings.findMany.mockResolvedValue([]);
      prismaService.product.findMany.mockResolvedValue([]);

      await service.findAllByStore(storeId, page, limit, '   ', '');

      const findManyArgs = prismaService.order.findMany.mock.calls[0][0];
      expect(findManyArgs.where).toEqual({ storeId });
    });

    it('should throw BadRequestException for invalid status', async () => {
      prismaService.storeProductSettings.findMany.mockResolvedValue([]);
      prismaService.product.findMany.mockResolvedValue([]);
      await expect(
        service.findAllByStore(storeId, page, limit, undefined, 'invalid-status'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate errors from prisma', async () => {
      const error = new Error('Failed to fetch store orders');
      prismaService.order.findMany.mockRejectedValue(error);
      prismaService.storeProductSettings.findMany.mockResolvedValue([]);
      prismaService.product.findMany.mockResolvedValue([]);

      await expect(service.findAllByStore(storeId, page, limit)).rejects.toThrow('Failed to fetch store orders');
      expect(prismaService.order.findMany).toHaveBeenCalledWith({
        where: {
          storeId,
        },
        include: expect.any(Object),
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      });
    });
  });

  describe('create', () => {
    const createOrderDto: CreateOrderDto = {
      storeId: 'store-123',
      packageId: 'package-123',
      paymentMethodId: 'payment-method-123',
      userIdForRecharge: 'player123456',
      couponTitle: undefined,
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

      const packageFromDifferentStore = {
        ...mockPackage,
        storeId: 'different-store-123',
      };

      prismaService.user.findFirst.mockResolvedValue(mockUser);
      prismaService.package.findUnique.mockResolvedValue(
        packageFromDifferentStore,
      );

      await expect(service.create(createOrderDto, userId)).rejects.toThrow(
        new BadRequestException('Package does not belong to this store'),
      );
    });

    it('should throw NotFoundException when payment method not available', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      const packageWithoutPaymentMethods = {
        ...mockPackage,
        paymentMethods: [],
      };

      prismaService.user.findFirst.mockResolvedValue(mockUser);
      prismaService.package.findUnique.mockResolvedValue(
        packageWithoutPaymentMethods,
      );

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

      await expect(service.create(createOrderDto, userId)).rejects.toThrow(
        'Database error',
      );
    });

    it('should create an order with coupon and update influencer monthly sales', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      const createOrderWithCouponDto = {
        ...createOrderDto,
        couponTitle: 'WELCOME10',
      };

      // Mock the validateCoupon method
      jest.spyOn(service, 'validateCoupon').mockResolvedValue({
        valid: true,
        discountAmount: 2.0,
        finalAmount: 17.99,
        coupon: mockCoupon,
      });

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
              qrCode: 'qrcode17.99',
              qrCodetextCopyPaste: 'qrcode-copypaste17.99',
            }),
          },
          order: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockOrder),
          },
          couponUsage: {
            create: jest.fn().mockResolvedValue({ id: 'coupon-usage-123' }),
            update: jest.fn().mockResolvedValue({}),
          },
          coupon: {
            update: jest.fn().mockResolvedValue({}),
          },
          influencerMonthlySales: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'monthly-sales-123',
              influencerId: 'influencer-123',
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
              totalSales: 17.99,
            }),
          },
        };
        return await callback(tx);
      });

      prismaService.user.findFirst.mockResolvedValue(mockUser);
      prismaService.package.findUnique.mockResolvedValue(mockPackage);
      prismaService.$transaction.mockImplementation(mockTransaction);

      const result = await service.create(createOrderWithCouponDto, userId);

      expect(result).toEqual(mockOrder);
    });

    it('should update existing influencer monthly sales when record exists', async () => {
      const { validateRequiredFields } = require('../../utils/validation.util');
      validateRequiredFields.mockImplementation(() => {});

      const createOrderWithCouponDto = {
        ...createOrderDto,
        couponTitle: 'WELCOME10',
      };
       // Mock the validateCoupon method
      jest.spyOn(service, 'validateCoupon').mockResolvedValue({
        valid: true,
        discountAmount: 2.0,
        finalAmount: 17.99,
        coupon: mockCoupon,
      });

      const existingMonthlySales = {
        id: 'monthly-sales-123',
        influencerId: 'influencer-123',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        totalSales: 50.0,
      };

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
              qrCode: 'qrcode17.99',
              qrCodetextCopyPaste: 'qrcode-copypaste17.99',
            }),
          },
          order: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockOrder),
          },
          couponUsage: {
            create: jest.fn().mockResolvedValue({ id: 'coupon-usage-123' }),
            update: jest.fn().mockResolvedValue({}),
          },
          coupon: {
            update: jest.fn().mockResolvedValue({}),
          },
          influencerMonthlySales: {
            findFirst: jest.fn().mockResolvedValue(existingMonthlySales),
            update: jest.fn().mockResolvedValue({
              ...existingMonthlySales,
              totalSales: 67.99, // 50.00 + 17.99
            }),
          },
        };
        return await callback(tx);
      });

      prismaService.user.findFirst.mockResolvedValue(mockUser);
      prismaService.package.findUnique.mockResolvedValue(mockPackage);
      prismaService.$transaction.mockImplementation(mockTransaction);

      const result = await service.create(createOrderWithCouponDto, userId);

      expect(result).toEqual(mockOrder);
    });
  });

  describe('validateCoupon', () => {
    const validateCouponDto: ValidateCouponDto = {
      couponTitle: 'WELCOME10',
      orderAmount: 50.0,
    };
    const storeId = 'store-123';
    const userId = 'user-123';

    it('should validate a valid coupon successfully', async () => {
      prismaService.coupon.findFirst.mockResolvedValue(mockCoupon);

      const result = await service.validateCoupon(
        validateCouponDto,
        storeId,
        userId,
      );

      expect(prismaService.coupon.findFirst).toHaveBeenCalledWith({
        where: {
          title: 'WELCOME10',
          storeId,
        },
        select: {
          id: true,
          title: true,
          discountPercentage: true,
          discountAmount: true,
          expiresAt: true,
          timesUsed: true,
          maxUses: true,
          minOrderAmount: true,
          isActive: true,
          isFirstPurchase: true,
          storeId: true,
          influencerId: true,
        },
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(5.0); // 10% of 50.00
      expect(result.finalAmount).toBe(45.0);
    });

    it('should return invalid when coupon not found', async () => {
      prismaService.coupon.findFirst.mockResolvedValue(null);

      const result = await service.validateCoupon(
        validateCouponDto,
        storeId,
        userId,
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon not found');
    });

    it('should return invalid when coupon is not active', async () => {
      const inactiveCoupon = { ...mockCoupon, isActive: false };
      prismaService.coupon.findFirst.mockResolvedValue(inactiveCoupon);

      const result = await service.validateCoupon(
        validateCouponDto,
        storeId,
        userId,
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon is not active');
    });

    it('should return invalid when coupon has expired', async () => {
      const expiredCoupon = {
        ...mockCoupon,
        expiresAt: new Date('2020-12-31'),
      };
      prismaService.coupon.findFirst.mockResolvedValue(expiredCoupon);

      const result = await service.validateCoupon(
        validateCouponDto,
        storeId,
        userId,
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon has expired');
    });

    it('should return invalid when usage limit reached', async () => {
      const maxUsesCoupon = { ...mockCoupon, maxUses: 5, timesUsed: 5 };
      prismaService.coupon.findFirst.mockResolvedValue(maxUsesCoupon);

      const result = await service.validateCoupon(
        validateCouponDto,
        storeId,
        userId,
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon usage limit reached');
    });

    it('should return invalid when order amount is below minimum', async () => {
      const minOrderCoupon = { ...mockCoupon, minOrderAmount: 100.0 };
      prismaService.coupon.findFirst.mockResolvedValue(minOrderCoupon);

      const result = await service.validateCoupon(
        validateCouponDto,
        storeId,
        userId,
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Minimum order amount required: 100');
    });

    it('should return invalid for first purchase coupon when user has previous orders', async () => {
      const firstPurchaseCoupon = { ...mockCoupon, isFirstPurchase: true };
      prismaService.coupon.findFirst.mockResolvedValue(firstPurchaseCoupon);
      prismaService.order.count.mockResolvedValue(2); // User has 2 previous orders

      const result = await service.validateCoupon(
        validateCouponDto,
        storeId,
        userId,
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe(
        'First purchase coupon can only be used by new customers',
      );
    });

    it('should return valid for first purchase coupon when user has no previous orders', async () => {
      const firstPurchaseCoupon = { ...mockCoupon, isFirstPurchase: true };
      prismaService.coupon.findFirst.mockResolvedValue(firstPurchaseCoupon);
      prismaService.order.count.mockResolvedValue(0); // User has no previous orders

      const result = await service.validateCoupon(
        validateCouponDto,
        storeId,
        userId,
      );

      expect(result.valid).toBe(true);
    });

    it('should handle percentage discount correctly', async () => {
      const percentageCoupon = {
        ...mockCoupon,
        discountPercentage: 20.0,
        discountAmount: null,
      };
      prismaService.coupon.findFirst.mockResolvedValue(percentageCoupon);

      const result = await service.validateCoupon(
        validateCouponDto,
        storeId,
        userId,
      );

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(10.0); // 20% of 50.00
      expect(result.finalAmount).toBe(40.0);
    });

    it('should handle amount discount correctly', async () => {
      const amountCoupon = {
        ...mockCoupon,
        discountPercentage: null,
        discountAmount: 15.0,
      };
      prismaService.coupon.findFirst.mockResolvedValue(amountCoupon);

      const result = await service.validateCoupon(
        validateCouponDto,
        storeId,
        userId,
      );

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(15.0);
      expect(result.finalAmount).toBe(35.0);
    });

    it('should limit amount discount to order amount', async () => {
      const amountCoupon = {
        ...mockCoupon,
        discountPercentage: null,
        discountAmount: 100.0,
      };
      prismaService.coupon.findFirst.mockResolvedValue(amountCoupon);

      const result = await service.validateCoupon(
        validateCouponDto,
        storeId,
        userId,
      );

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(50.0); // Limited to order amount
      expect(result.finalAmount).toBe(0.0);
    });
  });

  describe('applyCoupon', () => {
    const couponTitle = 'WELCOME10';
    const orderAmount = 50.0;
    const storeId = 'store-123';
    const userId = 'user-123';

    it('should apply a valid coupon successfully', async () => {
      const mockValidation = {
        valid: true,
        discountAmount: 5.0,
        finalAmount: 45.0,
        coupon: mockCoupon,
      };

      jest.spyOn(service, 'validateCoupon').mockResolvedValue(mockValidation);

      const result = await service.applyCoupon(
        couponTitle,
        orderAmount,
        storeId,
        userId,
      );

      expect(service.validateCoupon).toHaveBeenCalledWith(
        { couponTitle, orderAmount },
        storeId,
        userId,
      );
      expect(result).toEqual(mockValidation);
    });

    it('should throw BadRequestException when coupon validation fails', async () => {
      const mockValidation = {
        valid: false,
        message: 'Coupon has expired',
      };

      jest.spyOn(service, 'validateCoupon').mockResolvedValue(mockValidation);

      await expect(
        service.applyCoupon(couponTitle, orderAmount, storeId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle validation errors', async () => {
      jest
        .spyOn(service, 'validateCoupon')
        .mockRejectedValue(new Error('Validation error'));

      await expect(
        service.applyCoupon(couponTitle, orderAmount, storeId, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmCouponUsage', () => {
    it('should confirm coupon usage and update influencer monthly sales', async () => {
      const orderWithCoupon = {
        id: 'order-123',
        price: 17.99,
        couponUsages: [
          {
            id: 'coupon-usage-123',
            coupon: {
              id: 'coupon-123',
              influencerId: 'influencer-123',
            },
          },
        ],
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          coupon: {
            update: jest.fn().mockResolvedValue({}),
          },
          influencerMonthlySales: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'monthly-sales-123',
              influencerId: 'influencer-123',
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
              totalSales: 17.99,
            }),
          },
        };
        return await callback(tx);
      });

      prismaService.order.findUnique.mockResolvedValue(orderWithCoupon);
      prismaService.$transaction.mockImplementation(mockTransaction);

      await service.confirmCouponUsage('order-123');

      expect(prismaService.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        include: {
          couponUsages: {
            include: {
              coupon: {
                select: {
                  id: true,
                  influencerId: true,
                },
              },
            },
          },
        },
      });

      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should do nothing when order has no coupon usage', async () => {
      const orderWithoutCoupon = {
        id: 'order-123',
        price: 19.99,
        couponUsages: [],
      };

      prismaService.order.findUnique.mockResolvedValue(orderWithoutCoupon);

      await service.confirmCouponUsage('order-123');

      expect(prismaService.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        include: {
          couponUsages: {
            include: {
              coupon: {
                select: {
                  id: true,
                  influencerId: true,
                },
              },
            },
          },
        },
      });

      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully without breaking payment flow', async () => {
      prismaService.order.findUnique.mockRejectedValue(new Error('Database error'));

      // Should not throw error
      await expect(service.confirmCouponUsage('order-123')).resolves.toBeUndefined();
    });
  });

  describe('updateInfluencerMonthlySales', () => {
    it('should create new monthly sales record when none exists', async () => {
      const mockTx = {
        influencerMonthlySales: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'monthly-sales-123',
            influencerId: 'influencer-123',
            month: 12,
            year: 2024,
            totalSales: 100.0,
          }),
        },
      };

      const saleDate = new Date('2024-12-15');
      const influencerId = 'influencer-123';
      const saleAmount = 100.0;

      await service['updateInfluencerMonthlySales'](
        mockTx,
        influencerId,
        saleAmount,
        saleDate,
      );

      expect(mockTx.influencerMonthlySales.findFirst).toHaveBeenCalledWith({
        where: {
          influencerId,
          month: 12,
          year: 2024,
        },
      });

      expect(mockTx.influencerMonthlySales.create).toHaveBeenCalledWith({
        data: {
          influencerId,
          month: 12,
          year: 2024,
          totalSales: saleAmount,
        },
      });
    });

    it('should update existing monthly sales record when one exists', async () => {
      const existingRecord = {
        id: 'monthly-sales-123',
        influencerId: 'influencer-123',
        month: 12,
        year: 2024,
        totalSales: 50.0,
      };

      const mockTx = {
        influencerMonthlySales: {
          findFirst: jest.fn().mockResolvedValue(existingRecord),
          update: jest.fn().mockResolvedValue({
            ...existingRecord,
            totalSales: 150.0, // 50.00 + 100.00
          }),
        },
      };

      const saleDate = new Date('2024-12-15');
      const influencerId = 'influencer-123';
      const saleAmount = 100.0;

      await service['updateInfluencerMonthlySales'](
        mockTx,
        influencerId,
        saleAmount,
        saleDate,
      );

      expect(mockTx.influencerMonthlySales.findFirst).toHaveBeenCalledWith({
        where: {
          influencerId,
          month: 12,
          year: 2024,
        },
      });

      expect(mockTx.influencerMonthlySales.update).toHaveBeenCalledWith({
        where: {
          id: existingRecord.id,
        },
        data: {
          totalSales: {
            increment: saleAmount,
          },
          updatedAt: expect.any(Date),
        },
      });
    });
  });
});
