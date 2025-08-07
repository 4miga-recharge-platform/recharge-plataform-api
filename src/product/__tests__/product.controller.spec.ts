import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from '../product.controller';
import { ProductService } from '../product.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

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
        basePrice: 10.00,
        productId: 'product-123',
        storeId: 'store-123',
        paymentMethods: [
          {
            id: 'payment-123',
            name: 'Credit Card',
            price: 10.00,
            packageId: 'package-123',
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    const mockProductService = {
      findAll: jest.fn(),
      findAllForAdmin: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
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

      await expect(controller.findAllForAdmin()).rejects.toThrow('Failed to fetch products');
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

      await expect(controller.findAll(storeId)).rejects.toThrow('Failed to fetch products');
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

      await expect(controller.findOne(productId, storeId)).rejects.toThrow('Product not found');
      expect(productService.findOne).toHaveBeenCalledWith(productId, storeId);
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

      await expect(controller.create(createProductDto)).rejects.toThrow('Failed to create product');
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

      expect(productService.update).toHaveBeenCalledWith(productId, updateProductDto);
      expect(result).toEqual(updatedProduct);
    });

    it('should handle update errors', async () => {
      const error = new Error('Failed to update product');
      productService.update.mockRejectedValue(error);

      await expect(controller.update(productId, updateProductDto)).rejects.toThrow('Failed to update product');
      expect(productService.update).toHaveBeenCalledWith(productId, updateProductDto);
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

      await expect(controller.remove(productId)).rejects.toThrow('Failed to remove product');
      expect(productService.remove).toHaveBeenCalledWith(productId);
    });
  });
});
