import { Test, TestingModule } from '@nestjs/testing';
import { CreateProductDto } from '../dto/create-product.dto';
import { CreateStoreProductSettingsDto } from '../dto/create-store-product-settings.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { UpdateStoreProductSettingsDto } from '../dto/update-store-product-settings.dto';
import { ProductController } from '../product.controller';
import { ProductService } from '../product.service';

describe('ProductController', () => {
  let controller: ProductController;
  let productService: any;

  const mockProduct = {
    id: 'product-123',
    name: 'Mobile Recharge',
    description: 'Product for recharging credits on prepaid mobile phones.',
    instructions: 'Enter the phone number and the desired recharge amount.',
    imgBannerUrl: 'https://example.com/banner.png',
    imgCardUrl: 'https://example.com/card.png',
  };

  const mockProductWithPackages = {
    ...mockProduct,
    packages: [
      {
        id: 'package-123',
        name: 'R$ 10 Credit',
        amountCredits: 10,
        imgCardUrl: 'https://example.com/package-card.png',
        isOffer: false,
        basePrice: 10.0,
        productId: 'product-123',
        storeId: 'store-123',
        paymentMethods: [
          {
            id: 'payment-123',
            name: 'Credit Card',
            price: 10.0,
            packageId: 'package-123',
          },
        ],
      },
    ],
    storeCustomization: null,
  };

  const mockStoreProductSettings = {
    id: 'customization-123',
    storeId: 'store-123',
    productId: 'product-123',
    description: 'Custom description for our store',
    instructions: 'Custom instructions for our store',
    imgBannerUrl: 'https://custom-banner.com',
    imgCardUrl: 'https://custom-card.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockProductService = {
      findAll: jest.fn(),
      findAllForAdmin: jest.fn(),
      findOne: jest.fn(),
      findBigoProduct: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      // StoreProductSettings methods
      createStoreProductSettings: jest.fn(),
      findAllStoreProductSettings: jest.fn(),
      findOneStoreProductSettings: jest.fn(),
      updateStoreProductSettings: jest.fn(),
      removeStoreProductSettings: jest.fn(),
      updateStoreProductImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    productService = module.get(ProductService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllForAdmin', () => {
    it('should return all products for admin successfully', async () => {
      const products = [mockProduct];
      productService.findAllForAdmin.mockResolvedValue(products);

      const result = await controller.findAllForAdmin();

      expect(productService.findAllForAdmin).toHaveBeenCalled();
      expect(result).toEqual(products);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to fetch products');
      productService.findAllForAdmin.mockRejectedValue(error);

      await expect(controller.findAllForAdmin()).rejects.toThrow(
        'Failed to fetch products',
      );
      expect(productService.findAllForAdmin).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const storeId = 'store-123';

    it('should return all products with packages successfully', async () => {
      const products = [mockProductWithPackages];
      productService.findAll.mockResolvedValue(products);

      const result = await controller.findAll(storeId);

      expect(productService.findAll).toHaveBeenCalledWith(storeId);
      expect(result).toEqual(products);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to fetch products');
      productService.findAll.mockRejectedValue(error);

      await expect(controller.findAll(storeId)).rejects.toThrow(
        'Failed to fetch products',
      );
      expect(productService.findAll).toHaveBeenCalledWith(storeId);
    });
  });

  describe('findOne', () => {
    const productId = 'product-123';
    const storeId = 'store-123';

    it('should return a product with packages successfully', async () => {
      productService.findOne.mockResolvedValue(mockProductWithPackages);

      const result = await controller.findOne(productId, storeId);

      expect(productService.findOne).toHaveBeenCalledWith(productId, storeId);
      expect(result).toEqual(mockProductWithPackages);
    });

    it('should handle errors', async () => {
      const error = new Error('Product not found');
      productService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(productId, storeId)).rejects.toThrow(
        'Product not found',
      );
      expect(productService.findOne).toHaveBeenCalledWith(productId, storeId);
    });
  });

  describe('findBigoProduct', () => {
    const storeId = 'store-123';
    const mockBigoProduct = {
      id: 'bigo-product-123',
      name: 'Bigo Live',
      description: 'Recharge diamonds for Bigo Live',
      instructions: 'Enter your Bigo Live ID',
      imgBannerUrl: 'https://example.com/bigo-banner.png',
      imgCardUrl: 'https://example.com/bigo-card.png',
      packages: [
        {
          id: 'package-123',
          name: '100 Diamonds',
          amountCredits: 100,
          imgCardUrl: 'https://example.com/package-card.png',
          isOffer: false,
          basePrice: 5.0,
          productId: 'bigo-product-123',
          storeId: 'store-123',
          paymentMethods: [
            {
              id: 'payment-123',
              name: 'Credit Card',
              price: 5.0,
              packageId: 'package-123',
            },
          ],
        },
      ],
      storeCustomization: null,
    };

    it('should return Bigo product with packages successfully', async () => {
      productService.findBigoProduct.mockResolvedValue(mockBigoProduct);

      const result = await controller.findBigoProduct(storeId);

      expect(productService.findBigoProduct).toHaveBeenCalledWith(storeId);
      expect(result).toEqual(mockBigoProduct);
    });

    it('should handle errors when Bigo product not found', async () => {
      const error = new Error('Bigo product not found');
      productService.findBigoProduct.mockRejectedValue(error);

      await expect(controller.findBigoProduct(storeId)).rejects.toThrow(
        'Bigo product not found',
      );
      expect(productService.findBigoProduct).toHaveBeenCalledWith(storeId);
    });

    it('should handle database errors', async () => {
      const error = new Error('Failed to fetch Bigo product');
      productService.findBigoProduct.mockRejectedValue(error);

      await expect(controller.findBigoProduct(storeId)).rejects.toThrow(
        'Failed to fetch Bigo product',
      );
      expect(productService.findBigoProduct).toHaveBeenCalledWith(storeId);
    });
  });

  describe('create', () => {
    const createProductDto: CreateProductDto = {
      name: 'New Product',
      description: 'A new product description',
      instructions: 'Instructions for the new product',
      imgBannerUrl: 'https://example.com/new-banner.png',
      imgCardUrl: 'https://example.com/new-card.png',
    };

    it('should create a product successfully', async () => {
      productService.create.mockResolvedValue(mockProduct);

      const result = await controller.create(createProductDto);

      expect(productService.create).toHaveBeenCalledWith(createProductDto);
      expect(result).toEqual(mockProduct);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Failed to create product');
      productService.create.mockRejectedValue(error);

      await expect(controller.create(createProductDto)).rejects.toThrow(
        'Failed to create product',
      );
      expect(productService.create).toHaveBeenCalledWith(createProductDto);
    });
  });

  describe('update', () => {
    const productId = 'product-123';
    const updateProductDto: UpdateProductDto = {
      name: 'Updated Product',
      description: 'Updated description',
    };

    it('should update a product successfully', async () => {
      const updatedProduct = { ...mockProduct, ...updateProductDto };
      productService.update.mockResolvedValue(updatedProduct);

      const result = await controller.update(productId, updateProductDto);

      expect(productService.update).toHaveBeenCalledWith(
        productId,
        updateProductDto,
      );
      expect(result).toEqual(updatedProduct);
    });

    it('should handle update errors', async () => {
      const error = new Error('Failed to update product');
      productService.update.mockRejectedValue(error);

      await expect(
        controller.update(productId, updateProductDto),
      ).rejects.toThrow('Failed to update product');
      expect(productService.update).toHaveBeenCalledWith(
        productId,
        updateProductDto,
      );
    });
  });

  describe('remove', () => {
    const productId = 'product-123';

    it('should remove a product successfully', async () => {
      productService.remove.mockResolvedValue(mockProduct);

      const result = await controller.remove(productId);

      expect(productService.remove).toHaveBeenCalledWith(productId);
      expect(result).toEqual(mockProduct);
    });

    it('should handle remove errors', async () => {
      const error = new Error('Failed to remove product');
      productService.remove.mockRejectedValue(error);

      await expect(controller.remove(productId)).rejects.toThrow(
        'Failed to remove product',
      );
      expect(productService.remove).toHaveBeenCalledWith(productId);
    });
  });

  // StoreProductSettings routes tests
  describe('StoreProductSettings routes', () => {
    const createStoreProductSettingsDto: CreateStoreProductSettingsDto = {
      storeId: 'store-123',
      productId: 'product-123',
      description: 'Custom description for our store',
      instructions: 'Custom instructions for our store',
      imgBannerUrl: 'https://custom-banner.com',
      imgCardUrl: 'https://custom-card.com',
    };

    const updateStoreProductSettingsDto: UpdateStoreProductSettingsDto = {
      description: 'Updated custom description',
    };

    describe('createCustomization', () => {
      it('should create product customization successfully', async () => {
        productService.createStoreProductSettings.mockResolvedValue(
          mockStoreProductSettings,
        );

        const result = await controller.createCustomization(
          createStoreProductSettingsDto,
        );

        expect(productService.createStoreProductSettings).toHaveBeenCalledWith(
          createStoreProductSettingsDto,
        );
        expect(result).toEqual(mockStoreProductSettings);
      });

      it('should handle creation errors', async () => {
        const error = new Error('Failed to create product customization');
        productService.createStoreProductSettings.mockRejectedValue(error);

        await expect(
          controller.createCustomization(createStoreProductSettingsDto),
        ).rejects.toThrow('Failed to create product customization');
        expect(productService.createStoreProductSettings).toHaveBeenCalledWith(
          createStoreProductSettingsDto,
        );
      });
    });
    describe('updateCustomization', () => {
      const productId = 'product-123';
      const user = { id: 'user-1', storeId: 'store-123' } as any;

      it('should update a product customization successfully', async () => {
        const updatedCustomization = {
          ...mockStoreProductSettings,
          ...updateStoreProductSettingsDto,
        };
        productService.updateStoreProductSettings.mockResolvedValue(
          updatedCustomization,
        );

        const result = await controller.updateCustomization(
          productId,
          updateStoreProductSettingsDto,
          user,
        );

        expect(productService.updateStoreProductSettings).toHaveBeenCalledWith(
          user.storeId,
          productId,
          updateStoreProductSettingsDto,
        );
        expect(result).toEqual(updatedCustomization);
      });

      it('should handle update errors', async () => {
        const error = new Error('Failed to update product customization');
        productService.updateStoreProductSettings.mockRejectedValue(error);

        await expect(
          controller.updateCustomization(
            productId,
            updateStoreProductSettingsDto,
            user,
          ),
        ).rejects.toThrow('Failed to update product customization');
        expect(productService.updateStoreProductSettings).toHaveBeenCalledWith(
          user.storeId,
          productId,
          updateStoreProductSettingsDto,
        );
      });
    });

    describe('removeCustomization', () => {
      const customizationId = 'customization-123';

      it('should remove a product customization successfully', async () => {
        const successMessage = {
          message: 'Product customization deleted successfully',
        };
        productService.removeStoreProductSettings.mockResolvedValue(
          successMessage,
        );

        const result = await controller.removeCustomization(customizationId);

        expect(productService.removeStoreProductSettings).toHaveBeenCalledWith(
          customizationId,
        );
        expect(result).toEqual(successMessage);
      });

      it('should handle remove errors', async () => {
        const error = new Error('Failed to remove product customization');
        productService.removeStoreProductSettings.mockRejectedValue(error);

        await expect(
          controller.removeCustomization(customizationId),
        ).rejects.toThrow('Failed to remove product customization');
        expect(productService.removeStoreProductSettings).toHaveBeenCalledWith(
          customizationId,
        );
      });
    });
  });

  describe('uploadStoreProductBanner', () => {
    const productId = 'product-123';
    const user = { id: 'user-1', storeId: 'store-123' } as any;
    const file: any = {
      fieldname: 'file',
      originalname: 'banner.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from([1, 2, 3]),
      size: 3,
    };

    it('should upload banner image successfully', async () => {
      const mockResponse = {
        success: true,
        settings: { id: 'settings-123' },
        fileUrl:
          'https://storage.googleapis.com/bucket/store/store-123/product/product-123/banner/banner.png',
        message: 'Banner image updated successfully',
      };
      productService.updateStoreProductImage.mockResolvedValue(mockResponse);

      const result = await controller.uploadStoreProductBanner(
        productId,
        file,
        user,
      );

      expect(productService.updateStoreProductImage).toHaveBeenCalledWith(
        user.storeId,
        productId,
        file,
        'banner',
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw BadRequestException when file is missing', async () => {
      await expect(
        controller.uploadStoreProductBanner(productId, undefined as any, user),
      ).rejects.toThrow('No file provided');
      expect(productService.updateStoreProductImage).not.toHaveBeenCalled();
    });
  });

  describe('uploadStoreProductCard', () => {
    const productId = 'product-123';
    const user = { id: 'user-1', storeId: 'store-123' } as any;
    const file: any = {
      fieldname: 'file',
      originalname: 'card.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from([1, 2, 3]),
      size: 3,
    };

    it('should upload card image successfully', async () => {
      const mockResponse = {
        success: true,
        settings: { id: 'settings-123' },
        fileUrl:
          'https://storage.googleapis.com/bucket/store/store-123/product/product-123/card/card.jpg',
        message: 'Card image updated successfully',
      };
      productService.updateStoreProductImage.mockResolvedValue(mockResponse);

      const result = await controller.uploadStoreProductCard(
        productId,
        file,
        user,
      );

      expect(productService.updateStoreProductImage).toHaveBeenCalledWith(
        user.storeId,
        productId,
        file,
        'card',
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw BadRequestException when file is missing', async () => {
      await expect(
        controller.uploadStoreProductCard(productId, undefined as any, user),
      ).rejects.toThrow('No file provided');
      expect(productService.updateStoreProductImage).not.toHaveBeenCalled();
    });
  });
});
