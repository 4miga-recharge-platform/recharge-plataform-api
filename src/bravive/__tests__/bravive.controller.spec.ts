import { Test, TestingModule } from '@nestjs/testing';
import { BraviveController } from '../bravive.controller';
import { BraviveService } from '../bravive.service';
import { PaymentResponseDto } from '../dto/payment-response.dto';
import { WebhookPaymentDto, WebhookStatus } from '../dto/webhook-payment.dto';

describe('BraviveController', () => {
  let controller: BraviveController;
  let braviveService: any;

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
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BraviveController],
      providers: [
        {
          provide: BraviveService,
          useValue: mockBraviveService,
        },
      ],
    }).compile();

    controller = module.get<BraviveController>(BraviveController);
    braviveService = module.get(BraviveService);

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

      await expect(controller.handleWebhook(mockWebhookDto)).rejects.toThrow(
        'Processing error',
      );
    });
  });

  describe('getPayment', () => {
    it('should get payment by ID successfully', async () => {
      const originalEnv = process.env.BRAVIVE_API_TOKEN;
      process.env.BRAVIVE_API_TOKEN = 'test-token';
      braviveService.getPayment.mockResolvedValue(mockPaymentResponse);

      const result = await controller.getPayment('payment-123');

      expect(braviveService.getPayment).toHaveBeenCalledWith(
        'payment-123',
        'test-token',
      );
      expect(result).toEqual(mockPaymentResponse);

      // Restore original env
      if (originalEnv) {
        process.env.BRAVIVE_API_TOKEN = originalEnv;
      } else {
        delete process.env.BRAVIVE_API_TOKEN;
      }
    });

    it('should throw error when BRAVIVE_API_TOKEN is not configured', async () => {
      const originalEnv = process.env.BRAVIVE_API_TOKEN;
      delete process.env.BRAVIVE_API_TOKEN;

      await expect(controller.getPayment('payment-123')).rejects.toThrow(
        'BRAVIVE_API_TOKEN not configured',
      );

      // Restore original env
      if (originalEnv) {
        process.env.BRAVIVE_API_TOKEN = originalEnv;
      }
    });
  });

  describe('listPayments', () => {
    it('should list payments successfully', async () => {
      const originalEnv = process.env.BRAVIVE_API_TOKEN;
      process.env.BRAVIVE_API_TOKEN = 'test-token';
      const mockPayments = {
        data: [mockPaymentResponse],
        total: 1,
        page: 1,
        limit: 10,
      };
      braviveService.listPayments.mockResolvedValue(mockPayments);

      const result = await controller.listPayments(10, 1, 'PIX', 'PENDING');

      expect(braviveService.listPayments).toHaveBeenCalledWith('test-token', {
        limit: 10,
        page: 1,
        method: 'PIX',
        status: 'PENDING',
      });
      expect(result).toEqual(mockPayments);

      // Restore original env
      if (originalEnv) {
        process.env.BRAVIVE_API_TOKEN = originalEnv;
      } else {
        delete process.env.BRAVIVE_API_TOKEN;
      }
    });

    it('should list payments without query params', async () => {
      const originalEnv = process.env.BRAVIVE_API_TOKEN;
      process.env.BRAVIVE_API_TOKEN = 'test-token';
      const mockPayments = {
        data: [mockPaymentResponse],
        total: 1,
      };
      braviveService.listPayments.mockResolvedValue(mockPayments);

      const result = await controller.listPayments();

      expect(braviveService.listPayments).toHaveBeenCalledWith('test-token', {
        limit: undefined,
        page: undefined,
        method: undefined,
        status: undefined,
      });
      expect(result).toEqual(mockPayments);

      // Restore original env
      if (originalEnv) {
        process.env.BRAVIVE_API_TOKEN = originalEnv;
      } else {
        delete process.env.BRAVIVE_API_TOKEN;
      }
    });

    it('should throw error when BRAVIVE_API_TOKEN is not configured', async () => {
      const originalEnv = process.env.BRAVIVE_API_TOKEN;
      delete process.env.BRAVIVE_API_TOKEN;

      await expect(controller.listPayments()).rejects.toThrow(
        'BRAVIVE_API_TOKEN not configured',
      );

      // Restore original env
      if (originalEnv) {
        process.env.BRAVIVE_API_TOKEN = originalEnv;
      }
    });
  });
});

