import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from '../order.controller';
import { OrderService } from '../order.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { ValidateCouponByPackageDto } from '../dto/validate-coupon-by-package.dto';

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: any;

  const mockUser = {
    id: 'user-123',
    storeId: 'store-123',
    email: 'user@example.com',
    name: 'John Doe',
    phone: '123456789',
    password: 'hashed-password',
    documentType: 'cpf' as const,
    documentValue: '12345678901',
    createdAt: new Date(),
    updatedAt: new Date(),
    role: 'RESELLER_ADMIN_4MIGA_USER' as const,
  };

  const mockOrder = {
    id: 'order-123',
    orderNumber: '123456789012',
    price: 19.99,
    orderStatus: 'CREATED',
    storeId: 'store-123',
    userId: 'user-123',
    paymentId: 'payment-123',
    orderItemId: 'order-item-123',
    createdAt: new Date(),
    payment: {
      id: 'payment-123',
      name: 'pix',
      status: 'PAYMENT_PENDING',
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
        status: 'RECHARGE_PENDING',
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

  const mockPaginatedOrders = {
    data: [mockOrder],
    totalOrders: 1,
    page: 1,
    totalPages: 1,
    products: [
      {
        id: 'product-123',
        name: 'Sample Product',
      },
    ],
  };

  beforeEach(async () => {
    const mockOrderService = {
      findAll: jest.fn(),
      findAllByStore: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      validateCouponByPackage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    orderService = module.get(OrderService);

    jest.clearAllMocks();
  });

  describe('findAllForStore', () => {
    it('should return paginated store orders successfully', async () => {
      const page = 2;
      const limit = 10;

      orderService.findAllByStore.mockResolvedValue(mockPaginatedOrders);

      const result = await controller.findAllForStore(mockUser, page, limit);

      expect(orderService.findAllByStore).toHaveBeenCalledWith(
        mockUser.storeId,
        Number(page),
        Number(limit),
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockPaginatedOrders);
    });

    it('should use default pagination values for store orders', async () => {
      orderService.findAllByStore.mockResolvedValue(mockPaginatedOrders);

      const result = await controller.findAllForStore(mockUser);

      expect(orderService.findAllByStore).toHaveBeenCalledWith(
        mockUser.storeId,
        1,
        6,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockPaginatedOrders);
    });

    it('should handle errors when fetching store orders', async () => {
      const error = new Error('Failed to fetch store orders');
      orderService.findAllByStore.mockRejectedValue(error);

      await expect(controller.findAllForStore(mockUser)).rejects.toThrow(
        'Failed to fetch store orders',
      );
      expect(orderService.findAllByStore).toHaveBeenCalledWith(
        mockUser.storeId,
        1,
        6,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should forward search and status parameters', async () => {
      const search = 'john@example.com';
      const status = 'completed';
      orderService.findAllByStore.mockResolvedValue(mockPaginatedOrders);

      await controller.findAllForStore(mockUser, 3, 12, search, status);

      expect(orderService.findAllByStore).toHaveBeenCalledWith(
        mockUser.storeId,
        3,
        12,
        search,
        status,
        undefined,
      );
    });

    it('should forward productId parameter', async () => {
      const productId = 'product-123';
      orderService.findAllByStore.mockResolvedValue(mockPaginatedOrders);

      await controller.findAllForStore(
        mockUser,
        1,
        6,
        undefined,
        undefined,
        productId,
      );

      expect(orderService.findAllByStore).toHaveBeenCalledWith(
        mockUser.storeId,
        1,
        6,
        undefined,
        undefined,
        productId,
      );
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    const mockRequest = {
      user: mockUser,
    };

    it('should return paginated orders successfully', async () => {
      const page = 1;
      const limit = 6;

      orderService.findAll.mockResolvedValue(mockPaginatedOrders);

      const result = await controller.findAll(mockRequest, page, limit);

      expect(orderService.findAll).toHaveBeenCalledWith(
        mockUser.storeId,
        mockUser.id,
        Number(page),
        Number(limit),
      );
      expect(result).toEqual(mockPaginatedOrders);
    });

    it('should use default pagination values', async () => {
      orderService.findAll.mockResolvedValue(mockPaginatedOrders);

      const result = await controller.findAll(mockRequest);

      expect(orderService.findAll).toHaveBeenCalledWith(
        mockUser.storeId,
        mockUser.id,
        1,
        6,
      );
      expect(result).toEqual(mockPaginatedOrders);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to fetch orders');
      orderService.findAll.mockRejectedValue(error);

      await expect(controller.findAll(mockRequest)).rejects.toThrow(
        'Failed to fetch orders',
      );
      expect(orderService.findAll).toHaveBeenCalledWith(
        mockUser.storeId,
        mockUser.id,
        1,
        6,
      );
    });
  });

  describe('findOne', () => {
    const orderId = 'order-123';
    const mockRequest = {
      user: mockUser,
    };

    it('should return an order successfully', async () => {
      orderService.findOne.mockResolvedValue(mockOrder);

      const result = await controller.findOne(orderId, mockRequest);

      expect(orderService.findOne).toHaveBeenCalledWith(orderId, mockUser.id);
      expect(result).toEqual(mockOrder);
    });

    it('should handle errors', async () => {
      const error = new Error('Order not found');
      orderService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(orderId, mockRequest)).rejects.toThrow(
        'Order not found',
      );
      expect(orderService.findOne).toHaveBeenCalledWith(orderId, mockUser.id);
    });
  });

  describe('create', () => {
    const createOrderDto: CreateOrderDto = {
      storeId: 'store-123',
      packageId: 'package-123',
      paymentMethodId: 'payment-method-123',
      userIdForRecharge: 'player123456',
    };
    const mockRequest = {
      user: mockUser,
    };

    it('should create an order successfully', async () => {
      orderService.create.mockResolvedValue(mockOrder);

      const result = await controller.create(createOrderDto, mockRequest);

      expect(orderService.create).toHaveBeenCalledWith(
        createOrderDto,
        mockUser.id,
      );
      expect(result).toEqual(mockOrder);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Failed to create order');
      orderService.create.mockRejectedValue(error);

      await expect(
        controller.create(createOrderDto, mockRequest),
      ).rejects.toThrow('Failed to create order');
      expect(orderService.create).toHaveBeenCalledWith(
        createOrderDto,
        mockUser.id,
      );
    });
  });

  describe('validateCouponByPackage', () => {
    const validateCouponByPackageDto: ValidateCouponByPackageDto = {
      packageId: 'package-123',
      paymentMethodId: 'payment-method-123',
      couponTitle: 'WELCOME10',
    };
    const mockRequest = {
      user: mockUser,
    };
    const mockValidationResult = {
      valid: true,
      discountAmount: 2.0,
      finalAmount: 17.99,
      coupon: {
        id: 'coupon-123',
        title: 'WELCOME10',
      },
    };

    it('should validate coupon by package successfully', async () => {
      orderService.validateCouponByPackage.mockResolvedValue(
        mockValidationResult,
      );

      const result = await controller.validateCouponByPackage(
        validateCouponByPackageDto,
        mockRequest,
      );

      expect(orderService.validateCouponByPackage).toHaveBeenCalledWith(
        validateCouponByPackageDto.packageId,
        validateCouponByPackageDto.paymentMethodId,
        validateCouponByPackageDto.couponTitle,
        mockUser.storeId,
        mockUser.id,
      );
      expect(result).toEqual(mockValidationResult);
    });

    it('should handle package not found error', async () => {
      const error = new Error('Package not found');
      orderService.validateCouponByPackage.mockRejectedValue(error);

      await expect(
        controller.validateCouponByPackage(
          validateCouponByPackageDto,
          mockRequest,
        ),
      ).rejects.toThrow('Package not found');
      expect(orderService.validateCouponByPackage).toHaveBeenCalledWith(
        validateCouponByPackageDto.packageId,
        validateCouponByPackageDto.paymentMethodId,
        validateCouponByPackageDto.couponTitle,
        mockUser.storeId,
        mockUser.id,
      );
    });

    it('should handle validation errors', async () => {
      const error = new Error('Coupon not found');
      orderService.validateCouponByPackage.mockRejectedValue(error);

      await expect(
        controller.validateCouponByPackage(
          validateCouponByPackageDto,
          mockRequest,
        ),
      ).rejects.toThrow('Coupon not found');
      expect(orderService.validateCouponByPackage).toHaveBeenCalledWith(
        validateCouponByPackageDto.packageId,
        validateCouponByPackageDto.paymentMethodId,
        validateCouponByPackageDto.couponTitle,
        mockUser.storeId,
        mockUser.id,
      );
    });
  });
});
