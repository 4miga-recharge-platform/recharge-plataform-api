import {
  IndividualType,
  PaymentMethodName,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Helper functions to create test data in the database
 * These functions are used in integration tests to set up test scenarios
 */

export class DatabaseHelper {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a test store
   */
  async createStore(data?: {
    name?: string;
    email?: string;
    domain?: string;
    braviveApiToken?: string;
  }) {
    const uniqueId = Date.now().toString();
    return this.prisma.store.create({
      data: {
        name: data?.name || `Test Store ${uniqueId}`,
        email: data?.email || `test-store-${uniqueId}@example.com`,
        domain: data?.domain || `test-store-${uniqueId}.example.com`,
        bannersUrl: [],
        braviveApiToken: data?.braviveApiToken || 'test-bravive-token',
      },
    });
  }

  /**
   * Create a test user
   */
  async createUser(data: {
    storeId: string;
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    documentType?: IndividualType;
    documentValue?: string;
    role?: UserRole;
  }) {
    const uniqueId = Date.now().toString();
    const hashedPassword = await bcrypt.hash(
      data.password || 'password123',
      10,
    );

    return this.prisma.user.create({
      data: {
        name: data.name || `Test User ${uniqueId}`,
        email: data.email || `test-user-${uniqueId}@example.com`,
        phone: data.phone || `11999999999`,
        password: hashedPassword,
        documentType: data.documentType || IndividualType.cpf,
        documentValue: data.documentValue || `1234567890${uniqueId.slice(-2)}`,
        role: data.role || UserRole.USER,
        storeId: data.storeId,
      },
    });
  }

  /**
   * Create a test product
   */
  async createProduct(data?: {
    name?: string;
    description?: string;
    instructions?: string;
    imgBannerUrl?: string;
    imgCardUrl?: string;
  }) {
    const uniqueId = Date.now().toString();
    return this.prisma.product.create({
      data: {
        name: data?.name || `Test Product ${uniqueId}`,
        description:
          data?.description || `Test product description ${uniqueId}`,
        instructions:
          data?.instructions || `Test product instructions ${uniqueId}`,
        imgBannerUrl:
          data?.imgBannerUrl || `https://example.com/banner-${uniqueId}.png`,
        imgCardUrl:
          data?.imgCardUrl || `https://example.com/card-${uniqueId}.png`,
      },
    });
  }

  /**
   * Create a test package with payment method
   */
  async createPackage(data: {
    storeId: string;
    productId: string;
    name?: string;
    amountCredits?: number;
    basePrice?: number;
    imgCardUrl?: string;
    isOffer?: boolean;
    isActive?: boolean;
    paymentMethodName?: PaymentMethodName;
    paymentMethodPrice?: number;
  }) {
    const uniqueId = Date.now().toString();
    const packageData = await this.prisma.package.create({
      data: {
        name: data.name || `Test Package ${uniqueId}`,
        amountCredits: data.amountCredits || 100,
        basePrice: data.basePrice || 19.99,
        imgCardUrl:
          data.imgCardUrl || `https://example.com/package-${uniqueId}.png`,
        isOffer: data.isOffer || false,
        isActive: data.isActive !== undefined ? data.isActive : true,
        productId: data.productId,
        storeId: data.storeId,
      },
    });

    // Create payment method for the package
    const paymentMethod = await this.prisma.paymentMethod.create({
      data: {
        name: data.paymentMethodName || PaymentMethodName.pix,
        price: data.paymentMethodPrice || packageData.basePrice,
        packageId: packageData.id,
      },
    });

    return {
      ...packageData,
      paymentMethods: [paymentMethod],
    };
  }

  /**
   * Create a test influencer
   */
  async createInfluencer(data: {
    storeId: string;
    name?: string;
    email?: string;
    phone?: string;
    isActive?: boolean;
  }) {
    const uniqueId = Date.now().toString();
    return this.prisma.influencer.create({
      data: {
        name: data.name || `Test Influencer ${uniqueId}`,
        email: data.email || `test-influencer-${uniqueId}@example.com`,
        phone: data.phone || `11999999999`,
        isActive: data.isActive !== undefined ? data.isActive : true,
        storeId: data.storeId,
      },
    });
  }

  /**
   * Create a test coupon
   */
  async createCoupon(data: {
    storeId: string;
    influencerId: string;
    title?: string;
    discountPercentage?: number;
    discountAmount?: number;
    expiresAt?: Date | null;
    maxUses?: number | null;
    minOrderAmount?: number | null;
    isActive?: boolean;
    isFirstPurchase?: boolean;
    isOneTimePerBigoId?: boolean;
  }) {
    const uniqueId = Date.now().toString();
    return this.prisma.coupon.create({
      data: {
        title: data.title || `TESTCOUPON${uniqueId}`,
        discountPercentage: data.discountPercentage
          ? data.discountPercentage
          : null,
        discountAmount: data.discountAmount ? data.discountAmount : null,
        expiresAt: data.expiresAt !== undefined ? data.expiresAt : null,
        maxUses: data.maxUses !== undefined ? data.maxUses : null,
        minOrderAmount: data.minOrderAmount ? data.minOrderAmount : null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        isFirstPurchase: data.isFirstPurchase || false,
        isOneTimePerBigoId: data.isOneTimePerBigoId || false,
        storeId: data.storeId,
        influencerId: data.influencerId,
      },
    });
  }

  /**
   * Create a complete test scenario with store, user, product, package, and influencer
   * Useful for setting up full test scenarios quickly
   */
  async createCompleteTestScenario(data?: {
    storeName?: string;
    userName?: string;
    productName?: string;
    packageName?: string;
    packageAmountCredits?: number;
    packagePrice?: number;
    braviveApiToken?: string;
  }) {
    // Create store and user in a transaction to ensure consistency
    const result = await this.prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          name: data?.storeName || `Test Store ${Date.now()}`,
          email: `test-store-${Date.now()}@example.com`,
          domain: `test-store-${Date.now()}.example.com`,
          bannersUrl: [],
          braviveApiToken: data?.braviveApiToken || 'test-bravive-token',
        },
      });

      const uniqueId = Date.now().toString();
      const hashedPassword = await bcrypt.hash('password123', 10);

      const user = await tx.user.create({
        data: {
          name: data?.userName || `Test User ${uniqueId}`,
          email: `test-user-${uniqueId}@example.com`,
          phone: `11999999999`,
          password: hashedPassword,
          documentType: IndividualType.cpf,
          documentValue: `1234567890${uniqueId.slice(-2)}`,
          role: UserRole.USER,
          storeId: store.id,
        },
      });

      return { store, user };
    });

    const verifiedStore = result.store;
    const user = result.user;

    const product = await this.createProduct({
      name: data?.productName,
    });

    const packageData = await this.createPackage({
      storeId: verifiedStore.id,
      productId: product.id,
      name: data?.packageName,
      amountCredits: data?.packageAmountCredits,
      basePrice: data?.packagePrice,
    });

    // Fetch package with payment methods from database to ensure they're persisted
    const packageWithPaymentMethods = await this.prisma.package.findUnique({
      where: { id: packageData.id },
      include: {
        paymentMethods: true,
      },
    });

    if (!packageWithPaymentMethods) {
      throw new Error(
        `Package ${packageData.id} was not found in database after creation`,
      );
    }

    const influencer = await this.createInfluencer({
      storeId: verifiedStore.id,
    });

    return {
      store: verifiedStore,
      user,
      product,
      package: packageWithPaymentMethods,
      influencer,
    };
  }
}
