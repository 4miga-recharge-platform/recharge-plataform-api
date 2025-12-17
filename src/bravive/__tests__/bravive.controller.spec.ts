import { Test, TestingModule } from '@nestjs/testing';
import { StoreService } from '../../store/store.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../../order/order.service';
import { User } from '../../user/entities/user.entity';
import { BraviveController } from '../bravive.controller';
import { BraviveService } from '../bravive.service';
import { CreatePaymentDto, PaymentMethod } from '../dto/create-payment.dto';
import { PaymentResponseDto } from '../dto/payment-response.dto';
import { WebhookPaymentDto, WebhookStatus } from '../dto/webhook-payment.dto';

describe('BraviveController', () => {
  let controller: BraviveController;
  let braviveService: any;
  let storeService: any;
  let orderService: any;
  let prismaService: any;

  const mockUser: User = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '5511999999999',
    password: 'hashedPassword',
    documentType: 'cpf',
    documentValue: '12345678900',
    role: 'RESELLER_ADMIN_4MIGA_USER',
    createdAt: new Date(),
    updatedAt: new Date(),
    storeId: 'store-123',
  };

  const mockPaymentResponse: PaymentResponseDto = {
    id: 'payment-123',
    status: 'PENDING',
    method: 'PIX',
    pix_qr_code: 'https://example.com/qrcode.png',
    pix_code: '00020126360014BR.GOV.BCB.PIX...',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockWebhookDto: WebhookPaymentDto = {
    id: 'payment-123',
    type: 'PAYMENT',
    status: WebhookStatus.APPROVED,
    amount: 10000,
    currency: 'BRL',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    payer: {
      name: 'John Doe',
      email: 'john@example.com',
      document: '12345678900',
    },
    payment_method: {
      type: 'PIX',
      details: {},
    },
  };

  beforeEach(async () => {
    const mockBraviveService = {
      handleWebhook: jest.fn(),
      getPayment: jest.fn(),
      listPayments: jest.fn(),
      createPayment: jest.fn(),
      checkAndUpdatePaymentStatus: jest.fn(),
    };

    const mockStoreService = {
      getBraviveToken: jest.fn(),
    };

    const mockPrismaService = {
      order: {
        findFirst: jest.fn(),
      },
    };

    const mockOrderService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BraviveController],
      providers: [
        {
          provide: BraviveService,
          useValue: mockBraviveService,
        },
        {
          provide: StoreService,
          useValue: mockStoreService,
        },
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

    controller = module.get<BraviveController>(BraviveController);
    braviveService = module.get(BraviveService);
    storeService = module.get(StoreService);
    orderService = module.get(OrderService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleWebhook', () => {
    it('should process webhook successfully', async () => {
      braviveService.handleWebhook.mockResolvedValue(undefined);

      const result = await controller.handleWebhook(mockWebhookDto);

      expect(braviveService.handleWebhook).toHaveBeenCalledWith(mockWebhookDto);
      expect(result).toEqual({ message: 'Webhook received' });
    });

    it('should handle webhook processing errors', async () => {
      const error = new Error('Processing error');
      braviveService.handleWebhook.mockRejectedValue(error);

      const result = await controller.handleWebhook(mockWebhookDto);

      expect(braviveService.handleWebhook).toHaveBeenCalledWith(mockWebhookDto);
      expect(result).toEqual({
        message: 'Webhook received but error occurred',
        error: 'Processing error',
      });
    });
  });

  describe('createPayment', () => {
    const mockCreatePaymentDto: CreatePaymentDto = {
      amount: 10000,
      currency: 'BRL',
      description: 'Test payment',
      payer_name: 'John Doe',
      payer_email: 'john@example.com',
      payer_phone: '+5511999999999',
      payer_document: '12345678900',
      method: PaymentMethod.PIX,
    };

    it('should create a payment successfully', async () => {
      storeService.getBraviveToken.mockResolvedValue('test-token');
      braviveService.createPayment.mockResolvedValue(mockPaymentResponse);

      const result = await controller.createPayment(
        mockCreatePaymentDto,
        mockUser,
      );

      expect(storeService.getBraviveToken).toHaveBeenCalledWith('store-123');
      expect(braviveService.createPayment).toHaveBeenCalledWith(
        mockCreatePaymentDto,
        'test-token',
      );
      expect(result).toEqual(mockPaymentResponse);
    });

    it('should throw error when storeId is not found in user', async () => {
      const userWithoutStore = { ...mockUser, storeId: null };

      await expect(
        controller.createPayment(
          mockCreatePaymentDto,
          userWithoutStore as unknown as User,
        ),
      ).rejects.toThrow('Store ID not found in user data');
    });

    it('should throw error when Bravive token is not configured', async () => {
      storeService.getBraviveToken.mockResolvedValue(null);

      await expect(
        controller.createPayment(mockCreatePaymentDto, mockUser),
      ).rejects.toThrow('Bravive token not configured for this store');

      expect(storeService.getBraviveToken).toHaveBeenCalledWith('store-123');
    });
  });

  describe('getPayment', () => {
    it('should get payment by ID successfully', async () => {
      storeService.getBraviveToken.mockResolvedValue('test-token');
      braviveService.getPayment.mockResolvedValue(mockPaymentResponse);

      const result = await controller.getPayment('payment-123', mockUser);

      expect(storeService.getBraviveToken).toHaveBeenCalledWith('store-123');
      expect(braviveService.getPayment).toHaveBeenCalledWith(
        'payment-123',
        'test-token',
      );
      expect(result).toEqual(mockPaymentResponse);
    });

    it('should throw error when storeId is not found in user', async () => {
      const userWithoutStore = { ...mockUser, storeId: null };

      await expect(
        controller.getPayment(
          'payment-123',
          userWithoutStore as unknown as User,
        ),
      ).rejects.toThrow('Store ID not found in user data');
    });

    it('should throw error when Bravive token is not configured', async () => {
      storeService.getBraviveToken.mockResolvedValue(null);

      await expect(
        controller.getPayment('payment-123', mockUser),
      ).rejects.toThrow('Bravive token not configured for this store');

      expect(storeService.getBraviveToken).toHaveBeenCalledWith('store-123');
    });
  });

  describe('listPayments', () => {
    it('should list payments successfully', async () => {
      storeService.getBraviveToken.mockResolvedValue('test-token');
      const mockPayments = {
        data: [mockPaymentResponse],
        total: 1,
        page: 1,
        limit: 10,
      };
      braviveService.listPayments.mockResolvedValue(mockPayments);

      const result = await controller.listPayments(
        mockUser,
        10,
        1,
        'PIX',
        'PENDING',
      );

      expect(storeService.getBraviveToken).toHaveBeenCalledWith('store-123');
      expect(braviveService.listPayments).toHaveBeenCalledWith('test-token', {
        limit: 10,
        page: 1,
        method: 'PIX',
        status: 'PENDING',
      });
      expect(result).toEqual(mockPayments);
    });

    it('should list payments without query params', async () => {
      storeService.getBraviveToken.mockResolvedValue('test-token');
      const mockPayments = {
        data: [mockPaymentResponse],
        total: 1,
      };
      braviveService.listPayments.mockResolvedValue(mockPayments);

      const result = await controller.listPayments(mockUser);

      expect(storeService.getBraviveToken).toHaveBeenCalledWith('store-123');
      expect(braviveService.listPayments).toHaveBeenCalledWith('test-token', {
        limit: undefined,
        page: undefined,
        method: undefined,
        status: undefined,
      });
      expect(result).toEqual(mockPayments);
    });

    it('should throw error when storeId is not found in user', async () => {
      const userWithoutStore = { ...mockUser, storeId: null };

      await expect(
        controller.listPayments(userWithoutStore as unknown as User),
      ).rejects.toThrow('Store ID not found in user data');
    });

    it('should throw error when Bravive token is not configured', async () => {
      storeService.getBraviveToken.mockResolvedValue(null);

      await expect(controller.listPayments(mockUser)).rejects.toThrow(
        'Bravive token not configured for this store',
      );

      expect(storeService.getBraviveToken).toHaveBeenCalledWith('store-123');
    });
  });

  describe('checkPaymentStatus', () => {
    const mockOrder = {
      id: 'order-123',
      userId: 'user-123',
      storeId: 'store-123',
      payment: {
        id: 'payment-123',
        braviveId: 'bravive-payment-123',
        paymentProvider: 'bravive',
      },
    };

    const mockOrderResponse = {
      id: 'order-123',
      orderNumber: '123456789012',
      price: 19.99,
      basePrice: 19.99,
      orderStatus: 'PROCESSING',
      payment: {
        id: 'payment-123',
        status: 'PAYMENT_APPROVED',
      },
      orderItem: {
        productId: 'product-123',
        productName: 'Mobile Recharge',
        recharge: {
          userIdForRecharge: 'player123456',
          status: 'RECHARGE_PENDING',
          amountCredits: 100,
        },
        package: {
          packageId: 'package-123',
          name: 'Premium Package',
          imgCardUrl: 'https://example.com/package-card.png',
        },
      },
      user: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '5511999999999',
      },
      couponUsages: [],
    };

    it('should check payment status and return order successfully', async () => {
      prismaService.order.findFirst.mockResolvedValue(mockOrder);
      storeService.getBraviveToken.mockResolvedValue('test-token');
      braviveService.checkAndUpdatePaymentStatus.mockResolvedValue({
        status: 'APPROVED',
        updated: true,
      });
      orderService.findOne.mockResolvedValue(mockOrderResponse);

      const result = await controller.checkPaymentStatus('order-123', mockUser);

      expect(prismaService.order.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'order-123',
          userId: 'user-123',
          storeId: 'store-123',
        },
        include: {
          payment: true,
        },
      });
      expect(storeService.getBraviveToken).toHaveBeenCalledWith('store-123');
      expect(braviveService.checkAndUpdatePaymentStatus).toHaveBeenCalledWith(
        'bravive-payment-123',
        'test-token',
      );
      expect(orderService.findOne).toHaveBeenCalledWith('order-123', 'user-123');
      expect(result).toEqual(mockOrderResponse);
    });

    it('should throw error when order is not found', async () => {
      prismaService.order.findFirst.mockResolvedValue(null);

      await expect(
        controller.checkPaymentStatus('order-123', mockUser),
      ).rejects.toThrow('Order not found');
    });

    it('should throw error when payment does not have Bravive ID', async () => {
      const mockOrderWithoutBraviveId = {
        ...mockOrder,
        payment: {
          id: 'payment-123',
          braviveId: null,
          paymentProvider: 'bravive',
        },
      };

      prismaService.order.findFirst.mockResolvedValue(mockOrderWithoutBraviveId);

      await expect(
        controller.checkPaymentStatus('order-123', mockUser),
      ).rejects.toThrow('Payment not found or does not have Bravive ID');
    });

    it('should throw error when payment provider is not Bravive', async () => {
      const mockOrderWithOtherProvider = {
        ...mockOrder,
        payment: {
          id: 'payment-123',
          braviveId: 'bravive-payment-123',
          paymentProvider: 'other-provider',
        },
      };

      prismaService.order.findFirst.mockResolvedValue(mockOrderWithOtherProvider);

      await expect(
        controller.checkPaymentStatus('order-123', mockUser),
      ).rejects.toThrow(
        'Payment provider is not Bravive. Manual check only available for Bravive payments.',
      );
    });

    it('should throw error when storeId is not found in user', async () => {
      const userWithoutStore = { ...mockUser, storeId: null };

      await expect(
        controller.checkPaymentStatus(
          'order-123',
          userWithoutStore as unknown as User,
        ),
      ).rejects.toThrow('Store ID not found in user data');
    });

    it('should throw error when Bravive token is not configured', async () => {
      prismaService.order.findFirst.mockResolvedValue(mockOrder);
      storeService.getBraviveToken.mockResolvedValue(null);

      await expect(
        controller.checkPaymentStatus('order-123', mockUser),
      ).rejects.toThrow('Bravive token not configured for this store');
    });
  });
});
