import { Test, TestingModule } from '@nestjs/testing';
import { InfluencerController } from '../influencer.controller';
import { InfluencerService } from '../influencer.service';
import { CreateInfluencerDto } from '../dto/create-influencer.dto';
import { UpdateInfluencerDto } from '../dto/update-influencer.dto';

describe('InfluencerController', () => {
  let controller: InfluencerController;
  let influencerService: any;

  const mockInfluencer = {
    id: 'influencer-123',
    name: 'João Silva',
    email: 'joao@exemplo.com',
    phone: '+5511999999999',
    paymentMethod: 'pix',
    paymentData: 'PIX_JOAO123',
    isActive: true,
    storeId: 'store-123',
  };

  beforeEach(async () => {
    const mockInfluencerService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByStore: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InfluencerController],
      providers: [
        {
          provide: InfluencerService,
          useValue: mockInfluencerService,
        },
      ],
    }).compile();

    controller = module.get<InfluencerController>(InfluencerController);
    influencerService = module.get(InfluencerService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all influencers successfully', async () => {
      const influencers = [mockInfluencer];
      influencerService.findAll.mockResolvedValue(influencers);

      const result = await controller.findAll();

      expect(influencerService.findAll).toHaveBeenCalled();
      expect(result).toEqual(influencers);
    });

    it('should return influencers filtered by store when storeId is provided', async () => {
      const influencers = [mockInfluencer];
      influencerService.findByStore.mockResolvedValue(influencers);

      const result = await controller.findAll('store-123');

      expect(influencerService.findByStore).toHaveBeenCalledWith('store-123');
      expect(result).toEqual(influencers);
    });

    it('should handle errors when fetching all influencers', async () => {
      const error = new Error('Failed to fetch influencers');
      influencerService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow('Failed to fetch influencers');
      expect(influencerService.findAll).toHaveBeenCalled();
    });

    it('should handle errors when fetching influencers by store', async () => {
      const error = new Error('Failed to fetch influencers by store');
      influencerService.findByStore.mockRejectedValue(error);

      await expect(controller.findAll('store-123')).rejects.toThrow('Failed to fetch influencers by store');
      expect(influencerService.findByStore).toHaveBeenCalledWith('store-123');
    });
  });

  describe('create', () => {
    const createInfluencerDto: CreateInfluencerDto = {
      name: 'João Silva',
      email: 'joao@exemplo.com',
      phone: '+5511999999999',
      paymentMethod: 'pix',
      paymentData: 'PIX_JOAO123',
      isActive: true,
      storeId: 'store-123',
    };

    it('should create an influencer successfully', async () => {
      influencerService.create.mockResolvedValue(mockInfluencer);

      const result = await controller.create(createInfluencerDto);

      expect(influencerService.create).toHaveBeenCalledWith(createInfluencerDto);
      expect(result).toEqual(mockInfluencer);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Failed to create influencer');
      influencerService.create.mockRejectedValue(error);

      await expect(controller.create(createInfluencerDto)).rejects.toThrow('Failed to create influencer');
      expect(influencerService.create).toHaveBeenCalledWith(createInfluencerDto);
    });
  });

  describe('findOne', () => {
    it('should return an influencer by id successfully', async () => {
      influencerService.findOne.mockResolvedValue(mockInfluencer);

      const result = await controller.findOne('influencer-123');

      expect(influencerService.findOne).toHaveBeenCalledWith('influencer-123');
      expect(result).toEqual(mockInfluencer);
    });

    it('should handle errors when fetching influencer by id', async () => {
      const error = new Error('Failed to fetch influencer');
      influencerService.findOne.mockRejectedValue(error);

      await expect(controller.findOne('influencer-123')).rejects.toThrow('Failed to fetch influencer');
      expect(influencerService.findOne).toHaveBeenCalledWith('influencer-123');
    });
  });

  describe('update', () => {
    const updateInfluencerDto: UpdateInfluencerDto = {
      name: 'João Silva Atualizado',
      email: 'joao.novo@exemplo.com',
    };

    it('should update an influencer successfully', async () => {
      const updatedInfluencer = { ...mockInfluencer, ...updateInfluencerDto };
      influencerService.update.mockResolvedValue(updatedInfluencer);

      const result = await controller.update('influencer-123', updateInfluencerDto);

      expect(influencerService.update).toHaveBeenCalledWith('influencer-123', updateInfluencerDto);
      expect(result).toEqual(updatedInfluencer);
    });

    it('should handle update errors', async () => {
      const error = new Error('Failed to update influencer');
      influencerService.update.mockRejectedValue(error);

      await expect(controller.update('influencer-123', updateInfluencerDto)).rejects.toThrow('Failed to update influencer');
      expect(influencerService.update).toHaveBeenCalledWith('influencer-123', updateInfluencerDto);
    });
  });

  describe('remove', () => {
    it('should remove an influencer successfully', async () => {
      influencerService.remove.mockResolvedValue(mockInfluencer);

      const result = await controller.remove('influencer-123');

      expect(influencerService.remove).toHaveBeenCalledWith('influencer-123');
      expect(result).toEqual(mockInfluencer);
    });

    it('should handle removal errors', async () => {
      const error = new Error('Failed to remove influencer');
      influencerService.remove.mockRejectedValue(error);

      await expect(controller.remove('influencer-123')).rejects.toThrow('Failed to remove influencer');
      expect(influencerService.remove).toHaveBeenCalledWith('influencer-123');
    });
  });
});
