import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  createMockProduct,
  createMockUpdateProductDto,
  createMockProductRepository,
  createMockQueryBuilder,
  setupProductsTestModule,
  setupQueryBuilderMocks,
} from './helpers/products.test-helpers';
import { ProductsService } from './products.service';
import { UpdateProductDto } from './dto';

describe('ProductsService - Updates & Status Changes', () => {
  let service: ProductsService;
  const mockRepository = createMockProductRepository();
  const mockQueryBuilder = createMockQueryBuilder();
  const mockProduct = createMockProduct();

  beforeEach(async () => {
    setupQueryBuilderMocks(mockRepository, mockQueryBuilder);
    const testModule = await setupProductsTestModule(mockRepository);
    service = testModule.service;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('update', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';
    const updateDto: UpdateProductDto = createMockUpdateProductDto();

    it('should update product and return updated entity when valid data provided', async () => {
      const existingProduct = { ...mockProduct };
      const updatedProduct = { ...mockProduct, ...updateDto, updatedAt: new Date() };
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(existingProduct)
        .mockResolvedValueOnce(updatedProduct);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(productId, updateDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.update(productId, updateDto)).rejects.toThrow(NotFoundException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';

    it('should soft delete product when valid ID provided', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockProduct);
      mockRepository.softDelete.mockResolvedValue({ affected: 1 });

      await expect(service.remove(productId)).resolves.not.toThrow();
      expect(mockRepository.softDelete).toHaveBeenCalledWith(productId);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.remove(productId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('activate', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';

    it('should activate product when valid ID provided', async () => {
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce({ ...mockProduct, isActive: true });
      mockRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.activate(productId);

      expect(result).toBeDefined();
      expect(mockRepository.update).toHaveBeenCalledWith(productId, { isActive: true });
    });
  });

  describe('deactivate', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';

    it('should deactivate product when valid ID provided', async () => {
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce({ ...mockProduct, isActive: false });
      mockRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.deactivate(productId);

      expect(result).toBeDefined();
      expect(mockRepository.update).toHaveBeenCalledWith(productId, { isActive: false });
    });
  });

  describe('update - price validations', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';

    it('should validate price relationships when price is updated', async () => {
      const updateDto: UpdateProductDto = {
        price: 150,
        compareAtPrice: 100,
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockProduct);

      await expect(service.update(productId, updateDto)).rejects.toThrow(BadRequestException);
    });

    it('should validate price relationships when costPrice is updated', async () => {
      const updateDto: UpdateProductDto = {
        costPrice: -50,
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockProduct);

      await expect(service.update(productId, updateDto)).rejects.toThrow(BadRequestException);
    });

    it('should update successfully with valid price relationships', async () => {
      const updateDto: UpdateProductDto = {
        price: 99.99,
        costPrice: 50,
        compareAtPrice: 150,
      };
      const updatedProduct = { ...mockProduct, ...updateDto };
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(updatedProduct);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(productId, updateDto);

      expect(result).toBeDefined();
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should handle attributes update correctly', async () => {
      const updateDto: UpdateProductDto = {
        name: 'Updated Product',
        attributes: { color: 'blue', size: 'large' },
      };
      const updatedProduct = { ...mockProduct, ...updateDto };
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(updatedProduct);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(productId, updateDto);

      expect(result).toBeDefined();
      expect(mockRepository.update).toHaveBeenCalledWith(
        productId,
        expect.objectContaining({
          name: 'Updated Product',
          attributes: { color: 'blue', size: 'large' },
        }),
      );
    });

    it('should throw BadRequestException when update fails to return product', async () => {
      const updateDto: UpdateProductDto = {
        name: 'Updated Product',
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockProduct).mockResolvedValueOnce(null);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await expect(service.update(productId, updateDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when database error occurs during update', async () => {
      const updateDto: UpdateProductDto = {
        name: 'Updated Product',
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockProduct);
      mockRepository.update.mockRejectedValue(new Error('Database error'));

      await expect(service.update(productId, updateDto)).rejects.toThrow(BadRequestException);
    });
  });
});
