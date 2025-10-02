import { Test, TestingModule } from '@nestjs/testing';
import { CreatePackageDto } from '../dto/create-package.dto';
import { UpdatePackageDto } from '../dto/update-package.dto';
import { PackageController } from '../package.controller';
import { PackageService } from '../package.service';

describe('PackageController', () => {
  let controller: PackageController;
  let packageService: any;

  const mockPackage = {
    id: 'package-123',
    name: 'Premium Package',
    amountCredits: 100,
    imgCardUrl: 'https://example.com/package-card.png',
    isActive: true,
    isOffer: false,
    basePrice: 19.99,
    productId: 'product-123',
    storeId: 'store-123',
    paymentMethods: [
      {
        id: 'payment-123',
        name: 'pix',
        price: 19.99,
        packageId: 'package-123',
      },
    ],
  };

  beforeEach(async () => {
    const mockPackageService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      uploadCardImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PackageController],
      providers: [
        {
          provide: PackageService,
          useValue: mockPackageService,
        },
      ],
    }).compile();

    controller = module.get<PackageController>(PackageController);
    packageService = module.get(PackageService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    const storeId = 'store-123';

    it('should return all packages for a store successfully', async () => {
      const packages = [mockPackage];
      packageService.findAll.mockResolvedValue(packages);

      const result = await controller.findAll(storeId);

      expect(packageService.findAll).toHaveBeenCalledWith(storeId);
      expect(result).toEqual(packages);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to fetch packages');
      packageService.findAll.mockRejectedValue(error);

      await expect(controller.findAll(storeId)).rejects.toThrow(
        'Failed to fetch packages',
      );
      expect(packageService.findAll).toHaveBeenCalledWith(storeId);
    });
  });

  describe('create', () => {
    const createPackageDto: CreatePackageDto = {
      name: 'New Package',
      amountCredits: 50,
      imgCardUrl: 'https://example.com/new-package-card.png',
      isActive: true,
      isOffer: true,
      basePrice: 15.99,
      productId: 'product-123',
      paymentMethods: [
        {
          name: 'pix' as const,
          price: 15.99,
        },
      ],
    };

    const mockUser = {
      id: 'user-123',
      storeId: 'store-123',
      email: 'user@example.com',
      name: 'Test User',
      phone: '123456789',
      password: 'hashedPassword',
      documentType: 'cpf' as const,
      documentValue: '12345678901',
      role: 'USER' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      resetPasswordCode: null,
      resetPasswordExpires: null,
      emailConfirmationCode: null,
      emailVerified: true,
      emailConfirmationExpires: null,
    };

    it('should create a package successfully', async () => {
      packageService.create.mockResolvedValue(mockPackage);

      const result = await controller.create(createPackageDto, mockUser);

      expect(packageService.create).toHaveBeenCalledWith(
        createPackageDto,
        mockUser.storeId,
      );
      expect(result).toEqual(mockPackage);
    });

    it('should create a package with isActive field successfully', async () => {
      const createDtoWithIsActive = { ...createPackageDto, isActive: false };
      const mockPackageWithIsActive = { ...mockPackage, isActive: false };
      packageService.create.mockResolvedValue(mockPackageWithIsActive);

      const result = await controller.create(createDtoWithIsActive, mockUser);

      expect(packageService.create).toHaveBeenCalledWith(
        createDtoWithIsActive,
        mockUser.storeId,
      );
      expect(result).toEqual(mockPackageWithIsActive);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Failed to create package');
      packageService.create.mockRejectedValue(error);

      await expect(
        controller.create(createPackageDto, mockUser),
      ).rejects.toThrow('Failed to create package');
      expect(packageService.create).toHaveBeenCalledWith(
        createPackageDto,
        mockUser.storeId,
      );
    });
  });

  describe('findOne', () => {
    const packageId = 'package-123';

    it('should return a package successfully', async () => {
      packageService.findOne.mockResolvedValue(mockPackage);

      const result = await controller.findOne(packageId);

      expect(packageService.findOne).toHaveBeenCalledWith(packageId);
      expect(result).toEqual(mockPackage);
    });

    it('should handle find one errors', async () => {
      const error = new Error('Package not found');
      packageService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(packageId)).rejects.toThrow(
        'Package not found',
      );
      expect(packageService.findOne).toHaveBeenCalledWith(packageId);
    });
  });

  describe('update', () => {
    const packageId = 'package-123';
    const updatePackageDto: UpdatePackageDto = {
      name: 'Updated Package',
      isActive: false,
      basePrice: 25.99,
      paymentMethods: [
        {
          name: 'mercado_pago' as const,
          price: 25.99,
        },
      ],
    };

    it('should update a package successfully', async () => {
      const updatedPackage = { ...mockPackage, ...updatePackageDto };
      packageService.update.mockResolvedValue(updatedPackage);

      const result = await controller.update(packageId, updatePackageDto);

      expect(packageService.update).toHaveBeenCalledWith(
        packageId,
        updatePackageDto,
      );
      expect(result).toEqual(updatedPackage);
    });

    it('should update a package with isActive field successfully', async () => {
      const updateDtoWithIsActive = { ...updatePackageDto, isActive: true };
      const updatedPackageWithIsActive = {
        ...mockPackage,
        ...updateDtoWithIsActive,
      };
      packageService.update.mockResolvedValue(updatedPackageWithIsActive);

      const result = await controller.update(packageId, updateDtoWithIsActive);

      expect(packageService.update).toHaveBeenCalledWith(
        packageId,
        updateDtoWithIsActive,
      );
      expect(result).toEqual(updatedPackageWithIsActive);
    });

    it('should handle update errors', async () => {
      const error = new Error('Failed to update package');
      packageService.update.mockRejectedValue(error);

      await expect(
        controller.update(packageId, updatePackageDto),
      ).rejects.toThrow('Failed to update package');
      expect(packageService.update).toHaveBeenCalledWith(
        packageId,
        updatePackageDto,
      );
    });

    it('should handle payment method integrity validation errors', async () => {
      const updateDtoWithPaymentMethods = {
        paymentMethods: [
          { name: 'pix' as const, price: 19.99 },
          { name: 'paypal' as const, price: 25.99 },
        ],
      };

      const integrityError = new Error(
        'Cannot remove payment method "mercado_pago" because it has existing orders. ' +
          'Found order #123456789012 using this payment method. ' +
          'Please contact support if you need to modify this.',
      );

      packageService.update.mockRejectedValue(integrityError);

      await expect(
        controller.update(packageId, updateDtoWithPaymentMethods),
      ).rejects.toThrow(integrityError.message);

      expect(packageService.update).toHaveBeenCalledWith(
        packageId,
        updateDtoWithPaymentMethods,
      );
    });
  });

  describe('remove', () => {
    const packageId = 'package-123';

    it('should remove a package successfully', async () => {
      packageService.remove.mockResolvedValue(mockPackage);

      const result = await controller.remove(packageId);

      expect(packageService.remove).toHaveBeenCalledWith(packageId);
      expect(result).toEqual(mockPackage);
    });

    it('should handle remove errors', async () => {
      const error = new Error('Failed to remove package');
      packageService.remove.mockRejectedValue(error);

      await expect(controller.remove(packageId)).rejects.toThrow(
        'Failed to remove package',
      );
      expect(packageService.remove).toHaveBeenCalledWith(packageId);
    });
  });

  describe('uploadCardImage', () => {
    const packageId = 'package-123';
    const user = { id: 'user-1', storeId: 'store-123' } as any;
    const file: any = {
      fieldname: 'file',
      originalname: 'card.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from([1, 2, 3]),
      size: 3,
    };

    it('should upload card image successfully (single package)', async () => {
      const mockResponse = {
        success: true,
        package: { id: packageId, storeId: user.storeId },
        fileUrl:
          'https://storage.googleapis.com/bucket/store/store-123/packages/package-123/card.png',
        message: 'Package card image uploaded successfully',
      };

      packageService.uploadCardImage.mockResolvedValue(mockResponse);

      const result = await controller.uploadCardImage(
        packageId,
        file,
        'false',
        user,
      );

      expect(packageService.uploadCardImage).toHaveBeenCalledWith(
        packageId,
        file,
        user.storeId,
        false,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should upload card image successfully (all packages)', async () => {
      const mockResponse = {
        success: true,
        packages: [
          { id: 'package-1', storeId: user.storeId },
          { id: 'package-2', storeId: user.storeId },
        ],
        fileUrl:
          'https://storage.googleapis.com/bucket/store/store-123/product/product-123/shared/card.png',
        message: 'All 2 packages card images updated successfully',
      };

      packageService.uploadCardImage.mockResolvedValue(mockResponse);

      const result = await controller.uploadCardImage(
        packageId,
        file,
        'true',
        user,
      );

      expect(packageService.uploadCardImage).toHaveBeenCalledWith(
        packageId,
        file,
        user.storeId,
        true,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should use default value false when updateAllPackages is not provided', async () => {
      const mockResponse = {
        success: true,
        package: { id: packageId, storeId: user.storeId },
        fileUrl:
          'https://storage.googleapis.com/bucket/store/store-123/packages/package-123/card.png',
        message: 'Package card image uploaded successfully',
      };

      packageService.uploadCardImage.mockResolvedValue(mockResponse);

      const result = await controller.uploadCardImage(
        packageId,
        file,
        undefined,
        user,
      );

      expect(packageService.uploadCardImage).toHaveBeenCalledWith(
        packageId,
        file,
        user.storeId,
        false,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw BadRequestException when file is missing', async () => {
      await expect(
        controller.uploadCardImage(packageId, undefined as any, 'false', user),
      ).rejects.toThrow('No file provided');
      expect(packageService.uploadCardImage).not.toHaveBeenCalled();
    });
  });
});
