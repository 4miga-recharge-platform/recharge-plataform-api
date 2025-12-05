import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BraviveService } from '../bravive.service';
import { BraviveHttpService } from '../http/bravive-http.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BigoService } from '../../bigo/bigo.service';
import { OrderService } from '../../order/order.service';
import { CreatePaymentDto, PaymentMethod } from '../dto/create-payment.dto';
import { PaymentResponseDto } from '../dto/payment-response.dto';
import { WebhookPaymentDto, WebhookStatus } from '../dto/webhook-payment.dto';
import { OrderStatus } from '@prisma/client';

describe('BraviveService', () => {
  let service: BraviveService;
  let httpService: any;
  let prismaService: any;
  let bigoService: any;
  let orderService: any;

  const mockToken = 'test-bravive-token';

  const mockCreatePaymentDto: CreatePaymentDto = {
    amount: 10000, // 100.00 BRL in cents
    currency: 'BRL',
    description: 'Test payment',
    payer_name: 'John Doe',
    payer_email: 'john@example.com',
    payer_phone: '+5511999999999',
    payer_document: '12345678900',
    method: PaymentMethod.PIX,
    webhook_url: 'https://api.example.com/bravive/webhook',
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
    const mockHttpService = {
      post: jest.fn(),
      get: jest.fn(),
    };

    const mockPrismaService = {
      payment: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      recharge: {
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockBigoService = {
      diamondRecharge: jest.fn(),
    };

    const mockOrderService = {
      confirmCouponUsage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BraviveService,
        {
          provide: BraviveHttpService,
          useValue: mockHttpService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: BigoService,
          useValue: mockBigoService,
        },
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
      ],
    }).compile();

    service = module.get<BraviveService>(BraviveService);
    httpService = module.get(BraviveHttpService);
    prismaService = module.get(PrismaService);
    bigoService = module.get(BigoService);
    orderService = module.get(OrderService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create a payment successfully', async () => {
      httpService.post.mockResolvedValue(mockPaymentResponse);

      const result = await service.createPayment(mockCreatePaymentDto, mockToken);

      expect(httpService.post).toHaveBeenCalledWith(
        '/payments',
        mockCreatePaymentDto,
        mockToken,
      );
      expect(result).toEqual(mockPaymentResponse);
    });

    it('should throw BadRequestException when HTTP service fails', async () => {
      const error = new Error('Network error');
      httpService.post.mockRejectedValue(error);

      await expect(
        service.createPayment(mockCreatePaymentDto, mockToken),
      ).rejects.toThrow(BadRequestException);

      expect(httpService.post).toHaveBeenCalledWith(
        '/payments',
        mockCreatePaymentDto,
        mockToken,
      );
    });
  });

  describe('getPayment', () => {
    it('should fetch a payment successfully', async () => {
      httpService.get.mockResolvedValue(mockPaymentResponse);

      const result = await service.getPayment('payment-123', mockToken);

      expect(httpService.get).toHaveBeenCalledWith(
        '/payments/payment-123',
        mockToken,
      );
      expect(result).toEqual(mockPaymentResponse);
    });

    it('should throw BadRequestException when payment not found', async () => {
      const error = new Error('Payment not found');
      httpService.get.mockRejectedValue(error);

      await expect(
        service.getPayment('invalid-id', mockToken),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listPayments', () => {
    it('should list payments successfully', async () => {
      const mockPayments = {
        data: [mockPaymentResponse],
        total: 1,
        page: 1,
        limit: 10,
      };
      httpService.get.mockResolvedValue(mockPayments);

      const result = await service.listPayments(mockToken, {
        limit: 10,
        page: 1,
      });

      expect(httpService.get).toHaveBeenCalledWith(
        '/payments',
        mockToken,
        { limit: 10, page: 1 },
      );
      expect(result).toEqual(mockPayments);
    });

    it('should list payments without params', async () => {
      const mockPayments = {
        data: [mockPaymentResponse],
        total: 1,
      };
      httpService.get.mockResolvedValue(mockPayments);

      const result = await service.listPayments(mockToken);

      expect(httpService.get).toHaveBeenCalledWith('/payments', mockToken, undefined);
      expect(result).toEqual(mockPayments);
    });
  });

  describe('handleWebhook', () => {
    const mockPayment = {
      id: 'payment-db-123',
      externalId: 'payment-123',
      paymentProvider: 'bravive',
      order: {
        id: 'order-123',
        orderNumber: 'ORD123',
        price: '100.00',
        orderStatus: OrderStatus.CREATED,
        orderItem: {
          id: 'order-item-123',
          recharge: {
            id: 'recharge-123',
            userIdForRecharge: 'bigo-user-123',
            amountCredits: 100,
          },
          package: {
            id: 'package-info-123',
          },
        },
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+5511999999999',
          documentValue: '12345678900',
        },
      },
    };

    it('should handle APPROVED webhook and trigger Bigo recharge', async () => {
      prismaService.payment.findFirst.mockResolvedValue(mockPayment);
      prismaService.$transaction.mockImplementation(async (callback) => {
        return await callback({
          payment: {
            update: jest.fn().mockResolvedValue({}),
          },
          order: {
            update: jest.fn().mockResolvedValue({}),
          },
          recharge: {
            update: jest.fn().mockResolvedValue({}),
          },
        });
      });
      bigoService.diamondRecharge.mockResolvedValue({ rescode: 0 });
      prismaService.recharge.update.mockResolvedValue({});
      orderService.confirmCouponUsage.mockResolvedValue(undefined);

      await service.handleWebhook(mockWebhookDto);

      expect(prismaService.payment.findFirst).toHaveBeenCalledWith({
        where: {
          externalId: 'payment-123',
          paymentProvider: 'bravive',
        },
        include: expect.any(Object),
      });
      expect(bigoService.diamondRecharge).toHaveBeenCalled();
      expect(orderService.confirmCouponUsage).toHaveBeenCalledWith('order-123');
    });

    it('should handle APPROVED webhook without Bigo recharge if data missing', async () => {
      const paymentWithoutRecharge = {
        ...mockPayment,
        order: {
          ...mockPayment.order,
          orderItem: null,
        },
      };
      prismaService.payment.findFirst.mockResolvedValue(paymentWithoutRecharge);
      prismaService.$transaction.mockImplementation(async (callback) => {
        return await callback({
          payment: {
            update: jest.fn().mockResolvedValue({}),
          },
          order: {
            update: jest.fn().mockResolvedValue({}),
          },
        });
      });

      await service.handleWebhook(mockWebhookDto);

      expect(bigoService.diamondRecharge).not.toHaveBeenCalled();
    });

    it('should handle REJECTED webhook', async () => {
      const rejectedWebhook = {
        ...mockWebhookDto,
        status: WebhookStatus.REJECTED,
      };
      prismaService.payment.findFirst.mockResolvedValue(mockPayment);
      prismaService.$transaction.mockImplementation(async (callback) => {
        return await callback({
          payment: {
            update: jest.fn().mockResolvedValue({}),
          },
          order: {
            findUnique: jest.fn().mockResolvedValue({
              ...mockPayment.order,
              orderItem: mockPayment.order.orderItem,
            }),
            update: jest.fn().mockResolvedValue({}),
          },
          recharge: {
            update: jest.fn().mockResolvedValue({}),
          },
        });
      });

      await service.handleWebhook(rejectedWebhook);

      expect(prismaService.payment.findFirst).toHaveBeenCalled();
      expect(bigoService.diamondRecharge).not.toHaveBeenCalled();
    });

    it('should handle CANCELED webhook', async () => {
      const canceledWebhook = {
        ...mockWebhookDto,
        status: WebhookStatus.CANCELED,
      };
      prismaService.payment.findFirst.mockResolvedValue(mockPayment);
      prismaService.$transaction.mockImplementation(async (callback) => {
        return await callback({
          payment: {
            update: jest.fn().mockResolvedValue({}),
          },
          order: {
            findUnique: jest.fn().mockResolvedValue({
              ...mockPayment.order,
              orderItem: mockPayment.order.orderItem,
            }),
            update: jest.fn().mockResolvedValue({}),
          },
          recharge: {
            update: jest.fn().mockResolvedValue({}),
          },
        });
      });

      await service.handleWebhook(canceledWebhook);

      expect(prismaService.payment.findFirst).toHaveBeenCalled();
    });

    it('should handle REFUNDED webhook', async () => {
      const refundedWebhook = {
        ...mockWebhookDto,
        status: WebhookStatus.REFUNDED,
      };
      prismaService.payment.findFirst.mockResolvedValue(mockPayment);
      prismaService.$transaction.mockImplementation(async (callback) => {
        return await callback({
          order: {
            update: jest.fn().mockResolvedValue({}),
          },
        });
      });

      await service.handleWebhook(refundedWebhook);

      expect(prismaService.payment.findFirst).toHaveBeenCalled();
    });

    it('should return early if payment not found', async () => {
      prismaService.payment.findFirst.mockResolvedValue(null);

      await service.handleWebhook(mockWebhookDto);

      expect(prismaService.payment.findFirst).toHaveBeenCalled();
      expect(bigoService.diamondRecharge).not.toHaveBeenCalled();
    });

    it('should handle Bigo recharge failure gracefully', async () => {
      prismaService.payment.findFirst.mockResolvedValue(mockPayment);
      prismaService.$transaction.mockImplementation(async (callback) => {
        return await callback({
          payment: {
            update: jest.fn().mockResolvedValue({}),
          },
          order: {
            update: jest.fn().mockResolvedValue({}),
          },
          recharge: {
            update: jest.fn().mockResolvedValue({}),
          },
        });
      });
      bigoService.diamondRecharge.mockRejectedValue(new Error('Bigo API error'));

      // Should not throw
      await service.handleWebhook(mockWebhookDto);

      expect(bigoService.diamondRecharge).toHaveBeenCalled();
    });

    it('should handle CHARGEBACK webhook', async () => {
      const chargebackWebhook = {
        ...mockWebhookDto,
        status: WebhookStatus.CHARGEBACK,
      };
      prismaService.payment.findFirst.mockResolvedValue(mockPayment);
      prismaService.$transaction.mockImplementation(async (callback) => {
        return await callback({
          payment: {
            update: jest.fn().mockResolvedValue({}),
          },
          order: {
            findUnique: jest.fn().mockResolvedValue({
              ...mockPayment.order,
              orderItem: mockPayment.order.orderItem,
            }),
            update: jest.fn().mockResolvedValue({}),
          },
          recharge: {
            update: jest.fn().mockResolvedValue({}),
          },
        });
      });

      await service.handleWebhook(chargebackWebhook);

      expect(prismaService.payment.findFirst).toHaveBeenCalled();
      expect(bigoService.diamondRecharge).not.toHaveBeenCalled();
    });

    it('should handle IN_DISPUTE webhook', async () => {
      const disputedWebhook = {
        ...mockWebhookDto,
        status: WebhookStatus.IN_DISPUTE,
      };
      prismaService.payment.findFirst.mockResolvedValue(mockPayment);
      prismaService.$transaction.mockImplementation(async (callback) => {
        return await callback({
          payment: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'payment-db-123',
              status: 'PAYMENT_APPROVED',
            }),
            update: jest.fn().mockResolvedValue({}),
          },
        });
      });

      await service.handleWebhook(disputedWebhook);

      expect(prismaService.payment.findFirst).toHaveBeenCalled();
      expect(bigoService.diamondRecharge).not.toHaveBeenCalled();
    });
  });

  describe('generateSeqId', () => {
    it('should generate a valid seqid', () => {
      // Access private method through any cast
      const seqid = (service as any).generateSeqId();

      expect(seqid).toBeDefined();
      expect(typeof seqid).toBe('string');
      expect(seqid.length).toBeGreaterThanOrEqual(13);
      expect(seqid.length).toBeLessThanOrEqual(32);
      expect(seqid).toMatch(/^[a-z0-9_]+$/);
    });

    it('should generate unique seqids', () => {
      const seqid1 = (service as any).generateSeqId();
      const seqid2 = (service as any).generateSeqId();

      expect(seqid1).not.toBe(seqid2);
    });
  });
});

