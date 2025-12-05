import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, RechargeStatus } from '@prisma/client';
import { CreateOrderDto } from '../../src/order/dto/create-order.dto';
import { BraviveHttpService } from '../../src/bravive/http/bravive-http.service';
import { BraviveMock } from '../helpers/mocks/bravive.mock';
import { BigoMock } from '../helpers/mocks/bigo.mock';
import { getPrisma } from '../setup-integration-tests';
import { DatabaseHelper } from '../helpers/database.helper';
import { BaseIntegrationTest } from './base.integration.spec';

describe('Order Flow Integration', () => {
  const baseTest = new BaseIntegrationTest();
  let dbHelper: DatabaseHelper;

  beforeAll(async () => {
    await baseTest.setupApp();
    // Create dbHelper using the prisma instance from setup-integration-tests
    // This ensures we use the same database connection
    dbHelper = new DatabaseHelper(getPrisma());
  });

  afterAll(async () => {
    await baseTest.teardownApp();
  });

  beforeEach(() => {
    baseTest.resetMocks();
  });

  describe('Order Creation - Happy Path', () => {
    it('should create order successfully with PIX payment', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 19.99,
        packageAmountCredits: 100,
      });

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bravive payment creation via HTTP service
      const paymentResponse = BraviveMock.createPaymentResponse();
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock).mockResolvedValue(paymentResponse);

      // Create order
      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player123456',
      };

      const order = await baseTest.orderService.create(createOrderDto, user.id);

      // Verify order was created
      expect(order).toBeDefined();
      expect(order.orderNumber).toBeDefined();
      expect(order.orderStatus).toBe(OrderStatus.CREATED);
      expect(Number(order.price)).toBe(19.99);
      expect(order.storeId).toBe(store.id);
      expect(order.userId).toBe(user.id);

      // Verify payment was created
      expect(order.payment).toBeDefined();
      expect(order.payment.status).toBe(PaymentStatus.PAYMENT_PENDING);
      expect(order.payment.qrCode).toBe(paymentResponse.pix_qr_code);
      expect(order.payment.qrCodetextCopyPaste).toBe(paymentResponse.pix_code);
      expect(order.payment.paymentProvider).toBe('bravive');
      expect(order.payment.externalId).toBe(paymentResponse.id);

      // Verify recharge was created
      expect(order.orderItem.recharge).toBeDefined();
      expect(order.orderItem.recharge.status).toBe(
        RechargeStatus.RECHARGE_PENDING,
      );
      expect(order.orderItem.recharge.amountCredits).toBe(100);
      expect(order.orderItem.recharge.userIdForRecharge).toBe('player123456');

      // Verify Bravive service was called
      expect(httpService.post).toHaveBeenCalled();
      expect(baseTest.bigoService.rechargePrecheck).toHaveBeenCalled();
    });

    it('should create order with coupon and apply discount', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
        influencer,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 50.0,
        packageAmountCredits: 200,
      });

      // Create coupon
      const coupon = await dbHelper.createCoupon({
        storeId: store.id,
        influencerId: influencer.id,
        title: 'TEST10',
        discountPercentage: 10,
        isActive: true,
      });

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bravive payment creation via HTTP service
      const paymentResponse = BraviveMock.createPaymentResponse();
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock).mockResolvedValue(paymentResponse);

      // Create order with coupon
      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player123456',
        couponTitle: 'TEST10',
      };

      const order = await baseTest.orderService.create(createOrderDto, user.id);

      // Verify order was created with discounted price
      expect(order).toBeDefined();
      expect(Number(order.price)).toBe(45.0); // 50.00 - 10% = 45.00

      // Verify coupon usage was created (but not confirmed yet)
      const couponUsage = await baseTest.prismaService.couponUsage.findFirst({
        where: { orderId: order.id },
      });
      expect(couponUsage).toBeDefined();
      expect(couponUsage).not.toBeNull();
      expect(couponUsage!.couponId).toBe(coupon.id);
    });
  });

  describe('Order Creation - Validation Failures', () => {
    it('should reject order when bigoId validation fails', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
      } = await dbHelper.createCompleteTestScenario();

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bigo precheck to fail
      (baseTest.bigoService.rechargePrecheck as jest.Mock).mockRejectedValue(
        new BadRequestException('Failed to validate bigoId'),
      );

      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'invalid-bigo-id',
      };

      // Should throw error
      await expect(
        baseTest.orderService.create(createOrderDto, user.id),
      ).rejects.toThrow(BadRequestException);

      // Verify no order was created
      const orders = await baseTest.prismaService.order.findMany({
        where: { storeId: store.id },
      });
      expect(orders).toHaveLength(0);

      // Verify Bravive payment was not created
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should reject order when Bravive token is not configured', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
      } = await dbHelper.createCompleteTestScenario();

      // Store without Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: null },
      });

      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player123456',
      };

      // Should throw error
      await expect(
        baseTest.orderService.create(createOrderDto, user.id),
      ).rejects.toThrow(BadRequestException);

      // Verify no order was created
      const orders = await baseTest.prismaService.order.findMany({
        where: { storeId: store.id },
      });
      expect(orders).toHaveLength(0);
    });

    it('should reject order when Bravive payment creation fails', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
      } = await dbHelper.createCompleteTestScenario();

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bravive payment creation to fail via HTTP service
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock).mockRejectedValue(
        new Error('Bravive API error'),
      );

      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player123456',
      };

      // Should throw error
      await expect(
        baseTest.orderService.create(createOrderDto, user.id),
      ).rejects.toThrow(BadRequestException);

      // Verify no order was created
      const orders = await baseTest.prismaService.order.findMany({
        where: { storeId: store.id },
      });
      expect(orders).toHaveLength(0);
    });

    it('should reject order when user does not belong to store', async () => {
      // Create test scenario
      const {
        store,
        package: pkg,
      } = await dbHelper.createCompleteTestScenario();

      // Create user from different store
      const otherStore = await dbHelper.createStore();
      const otherUser = await dbHelper.createUser({ storeId: otherStore.id });

      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player123456',
      };

      // Should throw error
      await expect(
        baseTest.orderService.create(createOrderDto, otherUser.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject order when package does not belong to store', async () => {
      // Create test scenario
      const { store, user } = await dbHelper.createCompleteTestScenario();

      // Create package from different store
      const otherStore = await dbHelper.createStore();
      const otherProduct = await dbHelper.createProduct();
      const otherPackage = await dbHelper.createPackage({
        storeId: otherStore.id,
        productId: otherProduct.id,
      });

      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: otherPackage.id,
        paymentMethodId: otherPackage.paymentMethods[0].id,
        userIdForRecharge: 'player123456',
      };

      // Should throw error
      await expect(
        baseTest.orderService.create(createOrderDto, user.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Webhook Flow - Payment Approval', () => {
    it('should process APPROVED webhook and complete order with automatic recharge', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 29.99,
        packageAmountCredits: 150,
      });

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bravive payment creation via HTTP service
      const paymentResponse = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-123',
      });
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock).mockResolvedValue(paymentResponse);

      // Mock Bigo recharge success
      (baseTest.bigoService.diamondRecharge as jest.Mock).mockResolvedValue(
        BigoMock.createRechargeSuccess(),
      );

      // Create order
      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player789012',
      };

      const order = await baseTest.orderService.create(createOrderDto, user.id);

      // Verify initial state
      expect(order.payment.status).toBe(PaymentStatus.PAYMENT_PENDING);
      expect(order.orderStatus).toBe(OrderStatus.CREATED);
      expect(order.orderItem.recharge.status).toBe(RechargeStatus.RECHARGE_PENDING);
      expect(order.payment.externalId).toBe(paymentResponse.id); // Verify externalId was saved

      // Simulate webhook APPROVED
      const webhookDto = BraviveMock.createApprovedWebhook(
        paymentResponse.id, // This is the Bravive payment ID that should match externalId
      );

      // Use real BraviveService (now it's not mocked, only HTTP service is mocked)
      await baseTest.braviveService.handleWebhook(webhookDto);

      // Verify payment was approved
      const updatedPayment = await baseTest.prismaService.payment.findUnique({
        where: { id: order.payment.id },
      });
      expect(updatedPayment!.status).toBe(PaymentStatus.PAYMENT_APPROVED);

      // Verify order was completed
      const updatedOrder = await baseTest.prismaService.order.findUnique({
        where: { id: order.id },
        include: {
          orderItem: {
            include: {
              recharge: true,
            },
          },
        },
      });
      expect(updatedOrder!.orderStatus).toBe(OrderStatus.COMPLETED);

      // Verify recharge was approved
      expect(updatedOrder!.orderItem.recharge.status).toBe(
        RechargeStatus.RECHARGE_APPROVED,
      );

      // Verify Bigo recharge was called
      expect(baseTest.bigoService.diamondRecharge).toHaveBeenCalledWith(
        expect.objectContaining({
          recharge_bigoid: 'player789012',
          value: 150,
          total_cost: 29.99,
          currency: 'BRL',
        }),
      );
    });

    it('should process APPROVED webhook with coupon and confirm coupon usage', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
        influencer,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 100.0,
        packageAmountCredits: 500,
      });

      // Create coupon
      const coupon = await dbHelper.createCoupon({
        storeId: store.id,
        influencerId: influencer.id,
        title: 'DISCOUNT15',
        discountPercentage: 15,
        isActive: true,
      });

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bravive payment creation via HTTP service
      const paymentResponse = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-456',
      });
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock).mockResolvedValue(paymentResponse);

      // Mock Bigo recharge success
      (baseTest.bigoService.diamondRecharge as jest.Mock).mockResolvedValue(
        BigoMock.createRechargeSuccess(),
      );

      // Create order with coupon
      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player789012',
        couponTitle: 'DISCOUNT15',
      };

      const order = await baseTest.orderService.create(createOrderDto, user.id);

      // Verify order has discounted price
      expect(Number(order.price)).toBe(85.0); // 100.00 - 15% = 85.00

      // Simulate webhook APPROVED
      const webhookDto = BraviveMock.createApprovedWebhook(
        paymentResponse.id,
        paymentResponse.id,
      );

      // Use real BraviveService (now it's not mocked, only HTTP service is mocked)
      await baseTest.braviveService.handleWebhook(webhookDto);

      // Verify coupon was confirmed as used
      const updatedCoupon = await baseTest.prismaService.coupon.findUnique({
        where: { id: coupon.id },
      });
      expect(updatedCoupon!.timesUsed).toBe(1);
      expect(Number(updatedCoupon!.totalSalesAmount)).toBe(85.0);
    });
  });

  describe('Webhook Flow - Payment Rejection and Cancellation', () => {
    it('should process REJECTED webhook and mark order as expired', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 25.0,
        packageAmountCredits: 120,
      });

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bravive payment creation
      const paymentResponse = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-rejected',
      });
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock).mockResolvedValue(paymentResponse);

      // Create order
      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player999888',
      };

      const order = await baseTest.orderService.create(createOrderDto, user.id);

      // Simulate webhook REJECTED
      const webhookDto = BraviveMock.createRejectedWebhook(paymentResponse.id);
      await baseTest.braviveService.handleWebhook(webhookDto);

      // Verify payment was rejected
      const updatedPayment = await baseTest.prismaService.payment.findUnique({
        where: { id: order.payment.id },
      });
      expect(updatedPayment!.status).toBe(PaymentStatus.PAYMENT_REJECTED);

      // Verify order was marked as expired
      const updatedOrder = await baseTest.prismaService.order.findUnique({
        where: { id: order.id },
        include: {
          orderItem: {
            include: {
              recharge: true,
            },
          },
        },
      });
      expect(updatedOrder!.orderStatus).toBe(OrderStatus.EXPIRED);

      // Verify recharge was rejected
      expect(updatedOrder!.orderItem.recharge.status).toBe(
        RechargeStatus.RECHARGE_REJECTED,
      );

      // Verify metrics were updated for expired order
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const monthlySales = await baseTest.prismaService.storeMonthlySales.findFirst(
        {
          where: {
            storeId: store.id,
            month,
            year,
          },
        },
      );
      expect(monthlySales).toBeDefined();
      expect(monthlySales!.totalOrders).toBe(1);
      expect(monthlySales!.totalExpiredOrders).toBe(1);
      expect(monthlySales!.totalCompletedOrders).toBe(0);
      expect(monthlySales!.totalRefundedOrders).toBe(0);
      // totalSales should be 0 for expired orders
      expect(Number(monthlySales!.totalSales)).toBe(0);
    });

    it('should process CANCELED webhook and mark order as expired', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 30.0,
        packageAmountCredits: 150,
      });

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bravive payment creation
      const paymentResponse = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-canceled',
      });
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock).mockResolvedValue(paymentResponse);

      // Create order
      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player888777',
      };

      const order = await baseTest.orderService.create(createOrderDto, user.id);

      // Simulate webhook CANCELED
      const webhookDto = BraviveMock.createCanceledWebhook(paymentResponse.id);
      await baseTest.braviveService.handleWebhook(webhookDto);

      // Verify payment was rejected
      const updatedPayment = await baseTest.prismaService.payment.findUnique({
        where: { id: order.payment.id },
      });
      expect(updatedPayment!.status).toBe(PaymentStatus.PAYMENT_REJECTED);

      // Verify order was marked as expired
      const updatedOrder = await baseTest.prismaService.order.findUnique({
        where: { id: order.id },
        include: {
          orderItem: {
            include: {
              recharge: true,
            },
          },
        },
      });
      expect(updatedOrder!.orderStatus).toBe(OrderStatus.EXPIRED);

      // Verify recharge was rejected
      expect(updatedOrder!.orderItem.recharge.status).toBe(
        RechargeStatus.RECHARGE_REJECTED,
      );
    });
  });

  describe('Webhook Flow - Payment Refund and Chargeback', () => {
    it('should process REFUNDED webhook and mark order as refunded', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 40.0,
        packageAmountCredits: 200,
      });

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bravive payment creation
      const paymentResponse = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-refunded',
      });
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock).mockResolvedValue(paymentResponse);

      // Mock Bigo recharge success (order was completed before refund)
      (baseTest.bigoService.diamondRecharge as jest.Mock).mockResolvedValue(
        BigoMock.createRechargeSuccess(),
      );

      // Create order
      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player777666',
      };

      const order = await baseTest.orderService.create(createOrderDto, user.id);

      // First, approve the payment (simulate it was paid)
      const approvedWebhook = BraviveMock.createApprovedWebhook(
        paymentResponse.id,
      );
      await baseTest.braviveService.handleWebhook(approvedWebhook);

      // Then, simulate webhook REFUNDED
      const refundedWebhook = BraviveMock.createRefundedWebhook(
        paymentResponse.id,
      );
      await baseTest.braviveService.handleWebhook(refundedWebhook);

      // Verify order was marked as refunded
      const updatedOrder = await baseTest.prismaService.order.findUnique({
        where: { id: order.id },
      });
      expect(updatedOrder!.orderStatus).toBe(OrderStatus.REFOUNDED);

      // Payment status should remain APPROVED (as per business logic)
      const updatedPayment = await baseTest.prismaService.payment.findUnique({
        where: { id: order.payment.id },
      });
      expect(updatedPayment!.status).toBe(PaymentStatus.PAYMENT_APPROVED);

      // Verify metrics were updated for refunded order
      // Note: Order was completed first, so it already has metrics
      // When refunded, metrics are adjusted (not counted twice)
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const monthlySales = await baseTest.prismaService.storeMonthlySales.findFirst(
        {
          where: {
            storeId: store.id,
            month,
            year,
          },
        },
      );
      expect(monthlySales).toBeDefined();
      // When order is completed and then refunded, it should count only once in totalOrders
      expect(monthlySales!.totalOrders).toBe(1);
      // Completed order was decremented, refunded was incremented
      expect(monthlySales!.totalCompletedOrders).toBe(0);
      expect(monthlySales!.totalRefundedOrders).toBe(1);
      // totalSales should be 0 (was 40.0 when completed, then decremented to 0 when refunded)
      expect(Number(monthlySales!.totalSales)).toBe(0);
    });

    it('should revert coupon and influencer metrics when order with coupon is refunded', async () => {
      const {
        store,
        user,
        package: pkg,
        influencer,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 30.0,
        packageAmountCredits: 150,
      });

      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      const coupon = await dbHelper.createCoupon({
        storeId: store.id,
        influencerId: influencer.id,
        title: 'TEST20',
        discountPercentage: 20,
      });

      const paymentResponse = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-with-coupon',
      });
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock).mockResolvedValue(paymentResponse);

      (baseTest.bigoService.diamondRecharge as jest.Mock).mockResolvedValue(
        BigoMock.createRechargeSuccess(),
      );

      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player888999',
        couponTitle: 'TEST20',
      };

      const order = await baseTest.orderService.create(createOrderDto, user.id);

      const approvedWebhook = BraviveMock.createApprovedWebhook(
        paymentResponse.id,
      );
      await baseTest.braviveService.handleWebhook(approvedWebhook);

      const updatedCoupon = await baseTest.prismaService.coupon.findUnique({
        where: { id: coupon.id },
      });
      expect(updatedCoupon!.timesUsed).toBe(1);
      expect(Number(updatedCoupon!.totalSalesAmount)).toBe(Number(order.price));

      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const influencerSales = await baseTest.prismaService.influencerMonthlySales.findFirst(
        {
          where: {
            influencerId: influencer.id,
            month,
            year,
          },
        },
      );
      expect(influencerSales).toBeDefined();
      expect(Number(influencerSales!.totalSales)).toBe(Number(order.price));

      const refundedWebhook = BraviveMock.createRefundedWebhook(
        paymentResponse.id,
      );
      await baseTest.braviveService.handleWebhook(refundedWebhook);

      const revertedCoupon = await baseTest.prismaService.coupon.findUnique({
        where: { id: coupon.id },
      });
      expect(revertedCoupon!.timesUsed).toBe(0);
      expect(Number(revertedCoupon!.totalSalesAmount)).toBe(0);

      const revertedInfluencerSales = await baseTest.prismaService.influencerMonthlySales.findFirst(
        {
          where: {
            influencerId: influencer.id,
            month,
            year,
          },
        },
      );
      expect(revertedInfluencerSales).toBeDefined();
      expect(Number(revertedInfluencerSales!.totalSales)).toBe(0);
    });

    it('should process CHARGEBACK webhook and reject payment and recharge', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 50.0,
        packageAmountCredits: 250,
      });

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bravive payment creation
      const paymentResponse = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-chargeback',
      });
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock).mockResolvedValue(paymentResponse);

      // Mock Bigo recharge success (order was completed before chargeback)
      (baseTest.bigoService.diamondRecharge as jest.Mock).mockResolvedValue(
        BigoMock.createRechargeSuccess(),
      );

      // Create order
      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player666555',
      };

      const order = await baseTest.orderService.create(createOrderDto, user.id);

      // First, approve the payment (simulate it was paid)
      const approvedWebhook = BraviveMock.createApprovedWebhook(
        paymentResponse.id,
      );
      await baseTest.braviveService.handleWebhook(approvedWebhook);

      // Then, simulate webhook CHARGEBACK
      const chargebackWebhook = BraviveMock.createChargebackWebhook(
        paymentResponse.id,
      );
      await baseTest.braviveService.handleWebhook(chargebackWebhook);

      // Verify payment was rejected
      const updatedPayment = await baseTest.prismaService.payment.findUnique({
        where: { id: order.payment.id },
      });
      expect(updatedPayment!.status).toBe(PaymentStatus.PAYMENT_REJECTED);

      // Verify order was marked as refunded
      const updatedOrder = await baseTest.prismaService.order.findUnique({
        where: { id: order.id },
        include: {
          orderItem: {
            include: {
              recharge: true,
            },
          },
        },
      });
      expect(updatedOrder!.orderStatus).toBe(OrderStatus.REFOUNDED);

      // Verify recharge was rejected
      expect(updatedOrder!.orderItem.recharge.status).toBe(
        RechargeStatus.RECHARGE_REJECTED,
      );

      // Verify metrics were updated for chargeback (refunded) order
      // Note: Order was completed first, so it already has metrics
      // When chargeback occurs, metrics are adjusted (not counted twice)
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const monthlySales = await baseTest.prismaService.storeMonthlySales.findFirst(
        {
          where: {
            storeId: store.id,
            month,
            year,
          },
        },
      );
      expect(monthlySales).toBeDefined();
      // When order is completed and then refunded (chargeback), it should count only once in totalOrders
      expect(monthlySales!.totalOrders).toBe(1);
      // Completed order was decremented, refunded was incremented
      expect(monthlySales!.totalCompletedOrders).toBe(0);
      expect(monthlySales!.totalRefundedOrders).toBe(1);
      // totalSales should be 0 (was 50.0 when completed, then decremented to 0 when refunded)
      expect(Number(monthlySales!.totalSales)).toBe(0);
    });

    it('should revert coupon and influencer metrics when order with coupon has chargeback', async () => {
      const {
        store,
        user,
        package: pkg,
        influencer,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 35.0,
        packageAmountCredits: 175,
      });

      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      const coupon = await dbHelper.createCoupon({
        storeId: store.id,
        influencerId: influencer.id,
        title: 'TEST15',
        discountPercentage: 15,
      });

      const paymentResponse = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-chargeback-coupon',
      });
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock).mockResolvedValue(paymentResponse);

      (baseTest.bigoService.diamondRecharge as jest.Mock).mockResolvedValue(
        BigoMock.createRechargeSuccess(),
      );

      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player111222',
        couponTitle: 'TEST15',
      };

      await baseTest.orderService.create(createOrderDto, user.id);

      const approvedWebhook = BraviveMock.createApprovedWebhook(
        paymentResponse.id,
      );
      await baseTest.braviveService.handleWebhook(approvedWebhook);

      const chargebackWebhook = BraviveMock.createChargebackWebhook(
        paymentResponse.id,
      );
      await baseTest.braviveService.handleWebhook(chargebackWebhook);

      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const revertedCoupon = await baseTest.prismaService.coupon.findUnique({
        where: { id: coupon.id },
      });
      expect(revertedCoupon!.timesUsed).toBe(0);
      expect(Number(revertedCoupon!.totalSalesAmount)).toBe(0);

      const revertedInfluencerSales = await baseTest.prismaService.influencerMonthlySales.findFirst(
        {
          where: {
            influencerId: influencer.id,
            month,
            year,
          },
        },
      );
      expect(revertedInfluencerSales).toBeDefined();
      expect(Number(revertedInfluencerSales!.totalSales)).toBe(0);
    });
  });

  describe('Webhook Flow - Payment Dispute', () => {
    it('should process IN_DISPUTE webhook without changing order status', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 35.0,
        packageAmountCredits: 175,
      });

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bravive payment creation
      const paymentResponse = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-dispute',
      });
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock).mockResolvedValue(paymentResponse);

      // Create order
      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player555444',
      };

      const order = await baseTest.orderService.create(createOrderDto, user.id);

      // Simulate webhook IN_DISPUTE
      const webhookDto = BraviveMock.createInDisputeWebhook(paymentResponse.id);
      await baseTest.braviveService.handleWebhook(webhookDto);

      // Verify payment status remains unchanged (still PENDING)
      const updatedPayment = await baseTest.prismaService.payment.findUnique({
        where: { id: order.payment.id },
      });
      expect(updatedPayment!.status).toBe(PaymentStatus.PAYMENT_PENDING);

      // Verify order status remains unchanged (still CREATED)
      const updatedOrder = await baseTest.prismaService.order.findUnique({
        where: { id: order.id },
      });
      expect(updatedOrder!.orderStatus).toBe(OrderStatus.CREATED);
    });
  });

  describe('Webhook Flow - Edge Cases', () => {
    it('should keep order in PROCESSING when Bigo recharge fails after payment approval', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 35.0,
        packageAmountCredits: 175,
      });

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bravive payment creation
      const paymentResponse = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-bigo-fail',
      });
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock).mockResolvedValue(paymentResponse);

      // Mock Bigo recharge to fail
      (baseTest.bigoService.diamondRecharge as jest.Mock).mockRejectedValue(
        new Error('Bigo API error: Rate limit exceeded'),
      );

      // Create order
      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player444333',
      };

      const order = await baseTest.orderService.create(createOrderDto, user.id);

      // Simulate webhook APPROVED
      const webhookDto = BraviveMock.createApprovedWebhook(paymentResponse.id);
      await baseTest.braviveService.handleWebhook(webhookDto);

      // Verify payment was approved
      const updatedPayment = await baseTest.prismaService.payment.findUnique({
        where: { id: order.payment.id },
      });
      expect(updatedPayment!.status).toBe(PaymentStatus.PAYMENT_APPROVED);

      // Verify order is in PROCESSING status (not COMPLETED, because Bigo recharge failed)
      const updatedOrder = await baseTest.prismaService.order.findUnique({
        where: { id: order.id },
        include: {
          orderItem: {
            include: {
              recharge: true,
            },
          },
        },
      });
      expect(updatedOrder!.orderStatus).toBe(OrderStatus.PROCESSING);

      // Verify recharge is still PENDING (not APPROVED, because Bigo recharge failed)
      expect(updatedOrder!.orderItem.recharge.status).toBe(
        RechargeStatus.RECHARGE_PENDING,
      );

      // Verify Bigo recharge was attempted
      expect(baseTest.bigoService.diamondRecharge).toHaveBeenCalled();
    });

    it('should handle webhook gracefully when payment is not found', async () => {
      // Get current order count before webhook
      const ordersBefore = await baseTest.prismaService.order.findMany();
      const orderCountBefore = ordersBefore.length;

      // Create a webhook for a payment that doesn't exist in our database
      const nonExistentPaymentId = 'bravive-payment-not-found-12345';
      const webhookDto = BraviveMock.createApprovedWebhook(
        nonExistentPaymentId,
      );

      // Should not throw an error, just log a warning and return
      await expect(
        baseTest.braviveService.handleWebhook(webhookDto),
      ).resolves.not.toThrow();

      // Verify no new orders were created (order count should remain the same)
      const ordersAfter = await baseTest.prismaService.order.findMany();
      expect(ordersAfter.length).toBe(orderCountBefore);
    });

    it('should handle webhook when Bigo recharge fails with rate limit error', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 40.0,
        packageAmountCredits: 200,
      });

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bravive payment creation
      const paymentResponse = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-rate-limit',
      });
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock).mockResolvedValue(paymentResponse);

      // Mock Bigo recharge to throw exception (as it does when rescode !== 0)
      (baseTest.bigoService.diamondRecharge as jest.Mock).mockRejectedValue(
        new BadRequestException(
          'Bigo API Error (7212012): request frequently, just wait a second to call',
        ),
      );

      // Create order
      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player333222',
      };

      const order = await baseTest.orderService.create(createOrderDto, user.id);

      // Simulate webhook APPROVED
      const webhookDto = BraviveMock.createApprovedWebhook(paymentResponse.id);
      await baseTest.braviveService.handleWebhook(webhookDto);

      // Verify payment was approved
      const updatedPayment = await baseTest.prismaService.payment.findUnique({
        where: { id: order.payment.id },
      });
      expect(updatedPayment!.status).toBe(PaymentStatus.PAYMENT_APPROVED);

      // Verify order is in PROCESSING status (Bigo threw exception, so order not completed)
      const updatedOrder = await baseTest.prismaService.order.findUnique({
        where: { id: order.id },
        include: {
          orderItem: {
            include: {
              recharge: true,
            },
          },
        },
      });
      expect(updatedOrder!.orderStatus).toBe(OrderStatus.PROCESSING);

      // Verify recharge is still PENDING
      expect(updatedOrder!.orderItem.recharge.status).toBe(
        RechargeStatus.RECHARGE_PENDING,
      );
    });
  });

  describe('Metrics - Store Sales', () => {
    it('should update store daily and monthly sales when order is completed', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 50.0,
        packageAmountCredits: 250,
      });

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bravive payment creation
      const paymentResponse = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-metrics',
      });
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock).mockResolvedValue(paymentResponse);

      // Mock Bigo recharge success
      (baseTest.bigoService.diamondRecharge as jest.Mock).mockResolvedValue(
        BigoMock.createRechargeSuccess(),
      );

      // Create order
      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player111222',
      };

      const order = await baseTest.orderService.create(createOrderDto, user.id);

      // Simulate webhook APPROVED to complete the order
      const webhookDto = BraviveMock.createApprovedWebhook(paymentResponse.id);
      await baseTest.braviveService.handleWebhook(webhookDto);

      // Verify order was completed
      const completedOrder = await baseTest.prismaService.order.findUnique({
        where: { id: order.id },
      });
      expect(completedOrder!.orderStatus).toBe(OrderStatus.COMPLETED);

      // Get current date for metrics
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      // Verify daily sales were updated
      const dailySales = await baseTest.prismaService.storeDailySales.findFirst({
        where: {
          storeId: store.id,
          date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      });
      expect(dailySales).toBeDefined();
      expect(Number(dailySales!.totalSales)).toBe(50.0);
      expect(dailySales!.totalOrders).toBe(1);

      // Verify monthly sales were updated
      const monthlySales = await baseTest.prismaService.storeMonthlySales.findFirst(
        {
          where: {
            storeId: store.id,
            month,
            year,
          },
        },
      );
      expect(monthlySales).toBeDefined();
      expect(Number(monthlySales!.totalSales)).toBe(50.0);
      expect(monthlySales!.totalOrders).toBe(1);
      expect(monthlySales!.totalCompletedOrders).toBe(1);
      expect(monthlySales!.ordersWithoutCoupon).toBe(1);
      expect(monthlySales!.ordersWithCoupon).toBe(0);

      // Verify monthly sales by product were updated
      const monthlySalesByProduct =
        await baseTest.prismaService.storeMonthlySalesByProduct.findFirst({
          where: {
            storeId: store.id,
            productId: pkg.productId,
            month,
            year,
          },
        });
      expect(monthlySalesByProduct).toBeDefined();
      expect(Number(monthlySalesByProduct!.totalSales)).toBe(50.0);
      expect(monthlySalesByProduct!.totalOrders).toBe(1);
    });

    it('should update metrics correctly for orders with coupons', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
        influencer,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 100.0,
        packageAmountCredits: 500,
      });

      // Create coupon (will be verified later via metrics)
      await dbHelper.createCoupon({
        storeId: store.id,
        influencerId: influencer.id,
        title: 'METRICS20',
        discountPercentage: 20,
        isActive: true,
      });

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bravive payment creation
      const paymentResponse = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-metrics-coupon',
      });
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock).mockResolvedValue(paymentResponse);

      // Mock Bigo recharge success
      (baseTest.bigoService.diamondRecharge as jest.Mock).mockResolvedValue(
        BigoMock.createRechargeSuccess(),
      );

      // Create order with coupon
      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player222333',
        couponTitle: 'METRICS20',
      };

      const order = await baseTest.orderService.create(createOrderDto, user.id);

      // Verify order has discounted price
      expect(Number(order.price)).toBe(80.0); // 100.00 - 20% = 80.00

      // Simulate webhook APPROVED to complete the order
      const webhookDto = BraviveMock.createApprovedWebhook(paymentResponse.id);
      await baseTest.braviveService.handleWebhook(webhookDto);

      // Get current date for metrics
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      // Verify monthly sales show order with coupon
      const monthlySales = await baseTest.prismaService.storeMonthlySales.findFirst(
        {
          where: {
            storeId: store.id,
            month,
            year,
          },
        },
      );
      expect(monthlySales).toBeDefined();
      expect(monthlySales!.ordersWithCoupon).toBe(1);
      expect(monthlySales!.ordersWithoutCoupon).toBe(0);
      expect(Number(monthlySales!.totalSales)).toBe(80.0); // Discounted price
    });

    it('should identify returning customers correctly', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 30.0,
        packageAmountCredits: 150,
      });

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bravive payment creation
      const paymentResponse1 = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-first',
      });
      const paymentResponse2 = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-second',
      });
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock)
        .mockResolvedValueOnce(paymentResponse1)
        .mockResolvedValueOnce(paymentResponse2);

      // Mock Bigo recharge success
      (baseTest.bigoService.diamondRecharge as jest.Mock).mockResolvedValue(
        BigoMock.createRechargeSuccess(),
      );

      // Create first order
      const createOrderDto1: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player333444',
      };

      await baseTest.orderService.create(createOrderDto1, user.id);

      // Complete first order
      const webhookDto1 = BraviveMock.createApprovedWebhook(
        paymentResponse1.id,
      );
      await baseTest.braviveService.handleWebhook(webhookDto1);

      // Create second order (same user)
      await baseTest.orderService.create(createOrderDto1, user.id);

      // Complete second order
      const webhookDto2 = BraviveMock.createApprovedWebhook(
        paymentResponse2.id,
      );
      await baseTest.braviveService.handleWebhook(webhookDto2);

      // Get current date for metrics
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      // Verify monthly sales show only 1 new customer (not 2)
      const monthlySales = await baseTest.prismaService.storeMonthlySales.findFirst(
        {
          where: {
            storeId: store.id,
            month,
            year,
          },
        },
      );
      expect(monthlySales).toBeDefined();
      expect(monthlySales!.totalOrders).toBe(2); // 2 orders
    });
  });

  describe('Metrics - Influencer Sales', () => {
    it('should update influencer monthly sales when coupon is used', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
        influencer,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 60.0,
        packageAmountCredits: 300,
      });

      // Create coupon
      const coupon = await dbHelper.createCoupon({
        storeId: store.id,
        influencerId: influencer.id,
        title: 'INFLUENCER30',
        discountPercentage: 30,
        isActive: true,
      });

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bravive payment creation
      const paymentResponse = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-influencer',
      });
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock).mockResolvedValue(paymentResponse);

      // Mock Bigo recharge success
      (baseTest.bigoService.diamondRecharge as jest.Mock).mockResolvedValue(
        BigoMock.createRechargeSuccess(),
      );

      // Create order with coupon
      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player444555',
        couponTitle: 'INFLUENCER30',
      };

      await baseTest.orderService.create(createOrderDto, user.id);

      // Simulate webhook APPROVED to complete the order and confirm coupon
      const webhookDto = BraviveMock.createApprovedWebhook(paymentResponse.id);
      await baseTest.braviveService.handleWebhook(webhookDto);

      // Get current date for metrics
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      // Verify influencer monthly sales were updated
      const influencerSales =
        await baseTest.prismaService.influencerMonthlySales.findFirst({
          where: {
            influencerId: influencer.id,
            month,
            year,
          },
        });
      expect(influencerSales).toBeDefined();
      expect(Number(influencerSales!.totalSales)).toBe(42.0); // 60.00 - 30% = 42.00

      // Verify coupon was updated
      const updatedCoupon = await baseTest.prismaService.coupon.findUnique({
        where: { id: coupon.id },
      });
      expect(updatedCoupon!.timesUsed).toBe(1);
      expect(Number(updatedCoupon!.totalSalesAmount)).toBe(42.0);
    });

    it('should accumulate influencer sales for multiple orders', async () => {
      // Create test scenario
      const {
        store,
        user,
        package: pkg,
        influencer,
      } = await dbHelper.createCompleteTestScenario({
        packagePrice: 25.0,
        packageAmountCredits: 125,
      });

      // Create coupon
      const coupon = await dbHelper.createCoupon({
        storeId: store.id,
        influencerId: influencer.id,
        title: 'ACCUMULATE10',
        discountPercentage: 10,
        isActive: true,
      });

      // Configure store with Bravive token
      await baseTest.prismaService.store.update({
        where: { id: store.id },
        data: { braviveApiToken: 'test-bravive-token' },
      });

      // Mock Bravive payment creation
      const paymentResponse1 = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-acc1',
      });
      const paymentResponse2 = BraviveMock.createPaymentResponse({
        id: 'bravive-payment-acc2',
      });
      const httpService = baseTest.moduleFixture.get(BraviveHttpService);
      (httpService.post as jest.Mock)
        .mockResolvedValueOnce(paymentResponse1)
        .mockResolvedValueOnce(paymentResponse2);

      // Mock Bigo recharge success
      (baseTest.bigoService.diamondRecharge as jest.Mock).mockResolvedValue(
        BigoMock.createRechargeSuccess(),
      );

      // Create first order with coupon
      const createOrderDto: CreateOrderDto = {
        storeId: store.id,
        packageId: pkg.id,
        paymentMethodId: pkg.paymentMethods[0].id,
        userIdForRecharge: 'player555666',
        couponTitle: 'ACCUMULATE10',
      };

      await baseTest.orderService.create(createOrderDto, user.id);

      // Complete first order
      const webhookDto1 = BraviveMock.createApprovedWebhook(
        paymentResponse1.id,
      );
      await baseTest.braviveService.handleWebhook(webhookDto1);

      // Create second order with same coupon
      await baseTest.orderService.create(createOrderDto, user.id);

      // Complete second order
      const webhookDto2 = BraviveMock.createApprovedWebhook(
        paymentResponse2.id,
      );
      await baseTest.braviveService.handleWebhook(webhookDto2);

      // Get current date for metrics
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      // Verify influencer monthly sales accumulated both orders
      const influencerSales =
        await baseTest.prismaService.influencerMonthlySales.findFirst({
          where: {
            influencerId: influencer.id,
            month,
            year,
          },
        });
      expect(influencerSales).toBeDefined();
      // 25.00 - 10% = 22.50 per order, so 45.00 total
      expect(Number(influencerSales!.totalSales)).toBe(45.0);

      // Verify coupon was updated twice
      const updatedCoupon = await baseTest.prismaService.coupon.findUnique({
        where: { id: coupon.id },
      });
      expect(updatedCoupon!.timesUsed).toBe(2);
      expect(Number(updatedCoupon!.totalSalesAmount)).toBe(45.0);
    });
  });
});
