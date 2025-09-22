import { Test, TestingModule } from '@nestjs/testing';
import { PackageController } from '../package.controller';
import { PackageService } from '../package.service';
import { CreatePackageDto } from '../dto/create-package.dto';
import { UpdatePackageDto } from '../dto/update-package.dto';

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

      await expect(controller.findAll(storeId)).rejects.toThrow('Failed to fetch packages');
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
      storeId: 'store-123',
      paymentMethods: [
        {
          name: 'pix' as const,
          price: 15.99,
        },
      ],
    };

    it('should create a package successfully', async () => {
      packageService.create.mockResolvedValue(mockPackage);

      const result = await controller.create(createPackageDto);

      expect(packageService.create).toHaveBeenCalledWith(createPackageDto);
      expect(result).toEqual(mockPackage);
    });

    it('should create a package with isActive field successfully', async () => {
      const createDtoWithIsActive = { ...createPackageDto, isActive: false };
      const mockPackageWithIsActive = { ...mockPackage, isActive: false };
      packageService.create.mockResolvedValue(mockPackageWithIsActive);

      const result = await controller.create(createDtoWithIsActive);

      expect(packageService.create).toHaveBeenCalledWith(createDtoWithIsActive);
      expect(result).toEqual(mockPackageWithIsActive);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Failed to create package');
      packageService.create.mockRejectedValue(error);

      await expect(controller.create(createPackageDto)).rejects.toThrow('Failed to create package');
      expect(packageService.create).toHaveBeenCalledWith(createPackageDto);
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

      await expect(controller.findOne(packageId)).rejects.toThrow('Package not found');
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

      expect(packageService.update).toHaveBeenCalledWith(packageId, updatePackageDto);
      expect(result).toEqual(updatedPackage);
    });

    it('should update a package with isActive field successfully', async () => {
      const updateDtoWithIsActive = { ...updatePackageDto, isActive: true };
      const updatedPackageWithIsActive = { ...mockPackage, ...updateDtoWithIsActive };
      packageService.update.mockResolvedValue(updatedPackageWithIsActive);

      const result = await controller.update(packageId, updateDtoWithIsActive);

      expect(packageService.update).toHaveBeenCalledWith(packageId, updateDtoWithIsActive);
      expect(result).toEqual(updatedPackageWithIsActive);
    });

    it('should handle update errors', async () => {
      const error = new Error('Failed to update package');
      packageService.update.mockRejectedValue(error);

      await expect(controller.update(packageId, updatePackageDto)).rejects.toThrow('Failed to update package');
      expect(packageService.update).toHaveBeenCalledWith(packageId, updatePackageDto);
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

      await expect(controller.remove(packageId)).rejects.toThrow('Failed to remove package');
      expect(packageService.remove).toHaveBeenCalledWith(packageId);
    });
  });
});
