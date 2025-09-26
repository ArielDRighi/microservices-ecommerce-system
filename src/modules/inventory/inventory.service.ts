import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Inventory, InventoryMovement } from './entities/inventory.entity';
import { InventoryReservation } from './entities/inventory-reservation.entity';
import { InventoryMovementType } from './enums/inventory-movement-type.enum';
import {
  CheckStockDto,
  ReserveStockDto,
  ReleaseReservationDto,
  FulfillReservationDto,
  StockMovementDto,
  InventoryResponseDto,
  InventoryStockDto,
  ReservationResponseDto,
  InventoryQueryDto,
  PaginatedResponseDto,
} from './dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepository: Repository<InventoryMovement>,
    @InjectRepository(InventoryReservation)
    private readonly reservationRepository: Repository<InventoryReservation>,
    private readonly entityManager: EntityManager,
  ) {}

  /**
   * Check stock availability for a product
   */
  async checkAvailability(checkStockDto: CheckStockDto): Promise<InventoryStockDto> {
    const { productId, quantity, location = 'MAIN_WAREHOUSE' } = checkStockDto;

    this.logger.debug(
      `Checking availability for product ${productId}, quantity ${quantity}, location ${location}`,
    );

    const inventory = await this.inventoryRepository.findOne({
      where: {
        productId,
        location,
      },
      relations: ['product'],
    });

    if (!inventory) {
      throw new NotFoundException(
        `Inventory not found for product ${productId} at location ${location}`,
      );
    }

    const product = await inventory.product;
    const isAvailable = inventory.availableStock >= quantity;
    const status = this.getStockStatus(inventory);

    this.logger.debug(
      `Availability check result: ${isAvailable}, available stock: ${inventory.availableStock}`,
    );

    return {
      productId: product.id,
      physicalStock: inventory.currentStock,
      reservedStock: inventory.reservedStock,
      availableStock: inventory.availableStock,
      minimumStock: inventory.minimumStock,
      maximumStock: inventory.maximumStock || 0,
      reorderPoint: inventory.reorderPoint || 0,
      location: inventory.location,
      lastUpdated: inventory.updatedAt,
      status,
    };
  }

  /**
   * Reserve stock for a specific time period with Redis TTL
   */
  async reserveStock(reserveStockDto: ReserveStockDto): Promise<ReservationResponseDto> {
    const {
      productId,
      quantity,
      reservationId,
      ttlMinutes = 30,
      location = 'MAIN_WAREHOUSE',
      reason,
      referenceId,
    } = reserveStockDto;

    this.logger.debug(
      `Reserving stock: product ${productId}, quantity ${quantity}, reservation ${reservationId}`,
    );

    return await this.entityManager.transaction(async (manager) => {
      // Find inventory with pessimistic lock to prevent race conditions
      const inventory = await manager.findOne(Inventory, {
        where: {
          productId,
          location,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory) {
        throw new NotFoundException(
          `Inventory not found for product ${productId} at location ${location}`,
        );
      }

      // Then get the product relation separately
      const inventoryWithProduct = await manager.findOne(Inventory, {
        where: {
          productId,
          location,
        },
        relations: ['product'],
      });

      if (inventoryWithProduct?.product) {
        inventory.product = inventoryWithProduct.product;
      }

      // Check if enough stock is available
      if (inventory.availableStock < quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${inventory.availableStock}, Requested: ${quantity}`,
        );
      }

      // Reserve the stock
      const beforeStock = inventory.currentStock;
      try {
        inventory.reserveStock(quantity, reason || `Reservation: ${reservationId}`);
        await manager.save(inventory);
      } catch (error) {
        throw new ConflictException(
          error instanceof Error ? error.message : 'Failed to reserve stock',
        );
      }

      // Create movement record
      const movement = this.movementRepository.create({
        inventoryId: inventory.id,
        movementType: InventoryMovementType.RESERVATION,
        quantity: -quantity, // Negative because it's a reservation
        stockBefore: beforeStock,
        stockAfter: inventory.currentStock,
        referenceId: reservationId,
        referenceType: 'RESERVATION',
        reason: reason || `Stock reserved: ${referenceId || 'N/A'}`,
        performedBy: this.getCurrentUser(),
      });

      await manager.save(movement);

      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

      this.logger.debug(`Stock reserved successfully: ${quantity} units for ${ttlMinutes} minutes`);

      // TODO: Implement Redis TTL for auto-release
      // await this.redisService.setReservation(reservationId, {
      //   productId,
      //   quantity,
      //   location,
      //   expiresAt
      // }, ttlMinutes * 60);

      return {
        reservationId,
        productId,
        quantity,
        expiresAt,
        location,
        reference: referenceId,
        createdAt: new Date(),
        status: 'ACTIVE',
      };
    });
  }

  /**
   * Release a reservation back to available stock
   */
  async releaseReservation(releaseDto: ReleaseReservationDto): Promise<InventoryStockDto> {
    const { productId, quantity, reservationId, location = 'MAIN_WAREHOUSE', reason } = releaseDto;

    this.logger.debug(`Releasing reservation: ${reservationId} for product ${productId}`);

    return await this.entityManager.transaction(async (manager) => {
      const inventory = await manager.findOne(Inventory, {
        where: {
          productId,
          location,
        },
        relations: ['product'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory) {
        throw new NotFoundException(
          `Inventory not found for product ${productId} at location ${location}`,
        );
      }

      const beforeStock = inventory.currentStock;
      try {
        inventory.releaseReservedStock(quantity);
        await manager.save(inventory);
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Failed to release reservation',
        );
      }

      // Create movement record
      const movement = this.movementRepository.create({
        inventoryId: inventory.id,
        movementType: InventoryMovementType.RELEASE_RESERVATION,
        quantity: quantity, // Positive because stock is being released
        stockBefore: beforeStock,
        stockAfter: inventory.currentStock,
        referenceId: reservationId,
        referenceType: 'RESERVATION_RELEASE',
        reason: reason || 'Reservation released',
        performedBy: this.getCurrentUser(),
      });

      await manager.save(movement);

      // TODO: Remove from Redis
      // await this.redisService.removeReservation(reservationId);

      this.logger.debug(`Reservation released successfully: ${quantity} units`);

      return this.mapToStockDto(inventory);
    });
  }

  /**
   * Fulfill a reservation (convert to actual sale/usage)
   */
  async fulfillReservation(fulfillDto: FulfillReservationDto): Promise<InventoryStockDto> {
    const {
      productId,
      quantity,
      reservationId,
      orderId,
      location = 'MAIN_WAREHOUSE',
      notes,
    } = fulfillDto;

    this.logger.debug(`Fulfilling reservation: ${reservationId} for order ${orderId}`);

    return await this.entityManager.transaction(async (manager) => {
      const inventory = await manager.findOne(Inventory, {
        where: {
          productId,
          location,
        },
        relations: ['product'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory) {
        throw new NotFoundException(
          `Inventory not found for product ${productId} at location ${location}`,
        );
      }

      const beforeStock = inventory.currentStock;
      try {
        inventory.fulfillReservation(quantity);
        await manager.save(inventory);
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Failed to fulfill reservation',
        );
      }

      // Create movement record
      const movement = this.movementRepository.create({
        inventoryId: inventory.id,
        movementType: InventoryMovementType.SALE,
        quantity: -quantity, // Negative because stock is being consumed
        stockBefore: beforeStock,
        stockAfter: inventory.currentStock,
        referenceId: orderId,
        referenceType: 'ORDER',
        reason: notes || `Order fulfillment: ${orderId}`,
        performedBy: this.getCurrentUser(),
      });

      await manager.save(movement);

      // TODO: Remove from Redis
      // await this.redisService.removeReservation(reservationId);

      this.logger.debug(
        `Reservation fulfilled successfully: ${quantity} units for order ${orderId}`,
      );

      return this.mapToStockDto(inventory);
    });
  }

  /**
   * Add stock to inventory (replenish/restock)
   */
  async addStock(movementDto: StockMovementDto): Promise<InventoryStockDto> {
    const { inventoryId, quantity, movementType, unitCost, referenceId, referenceType, reason } =
      movementDto;

    this.logger.debug(
      `Adding stock: inventory ${inventoryId}, quantity ${quantity}, type ${movementType}`,
    );

    if (quantity <= 0) {
      throw new BadRequestException('Add stock quantity must be positive');
    }

    return await this.entityManager.transaction(async (manager) => {
      // First get inventory with lock but without relations to avoid LEFT JOIN + FOR UPDATE issue
      const inventory = await manager.findOne(Inventory, {
        where: { id: inventoryId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory) {
        throw new NotFoundException(`Inventory not found with ID: ${inventoryId}`);
      }

      // Then get the product relation separately
      const inventoryWithProduct = await manager.findOne(Inventory, {
        where: { id: inventoryId },
        relations: ['product'],
      });

      if (inventoryWithProduct?.product) {
        inventory.product = inventoryWithProduct.product;
      }

      const beforeStock = inventory.currentStock;
      try {
        inventory.addStock(quantity, unitCost);
        await manager.save(inventory);
      } catch (error) {
        this.logger.error(
          `Failed to add stock: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error,
        );
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Failed to add stock',
        );
      }

      // Create movement record
      const movement = this.movementRepository.create({
        inventoryId: inventory.id,
        movementType,
        quantity,
        unitCost,
        stockBefore: beforeStock,
        stockAfter: inventory.currentStock,
        referenceId,
        referenceType,
        reason: reason || `Stock added: ${movementType}`,
        performedBy: this.getCurrentUser(),
      });

      await manager.save(movement);

      this.logger.debug(`Stock added successfully: ${quantity} units`);

      return this.mapToStockDto(inventory);
    });
  }

  /**
   * Remove stock from inventory
   */
  async removeStock(movementDto: StockMovementDto): Promise<InventoryStockDto> {
    const { inventoryId, quantity, movementType, referenceId, referenceType, reason } = movementDto;

    this.logger.debug(
      `Removing stock: inventory ${inventoryId}, quantity ${quantity}, type ${movementType}`,
    );

    if (quantity <= 0) {
      throw new BadRequestException('Remove stock quantity must be positive');
    }

    return await this.entityManager.transaction(async (manager) => {
      // First get inventory with lock but without relations to avoid LEFT JOIN + FOR UPDATE issue
      const inventory = await manager.findOne(Inventory, {
        where: { id: inventoryId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory) {
        throw new NotFoundException(`Inventory not found with ID: ${inventoryId}`);
      }

      // Then get the product relation separately
      const inventoryWithProduct = await manager.findOne(Inventory, {
        where: { id: inventoryId },
        relations: ['product'],
      });

      if (inventoryWithProduct?.product) {
        inventory.product = inventoryWithProduct.product;
      }

      const beforeStock = inventory.currentStock;
      try {
        inventory.removeStock(quantity);
        await manager.save(inventory);
      } catch (error) {
        this.logger.error(
          `Failed to remove stock: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error,
        );
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Failed to remove stock',
        );
      }

      // Create movement record
      const movement = this.movementRepository.create({
        inventoryId: inventory.id,
        movementType,
        quantity: -quantity, // Negative for removal
        stockBefore: beforeStock,
        stockAfter: inventory.currentStock,
        referenceId,
        referenceType,
        reason: reason || `Stock removed: ${movementType}`,
        performedBy: this.getCurrentUser(),
      });

      await manager.save(movement);

      this.logger.debug(`Stock removed successfully: ${quantity} units`);

      return this.mapToStockDto(inventory);
    });
  }

  /**
   * Get inventory by product ID
   */
  async getInventoryByProduct(
    productId: string,
    location = 'MAIN_WAREHOUSE',
  ): Promise<InventoryResponseDto> {
    const inventory = await this.inventoryRepository.findOne({
      where: {
        productId,
        location,
      },
      relations: ['product'],
    });

    if (!inventory) {
      throw new NotFoundException(
        `Inventory not found for product ${productId} at location ${location}`,
      );
    }

    const product = await inventory.product;
    const movementsCount = await this.movementRepository.count({
      where: { inventoryId: inventory.id },
    });

    return {
      id: inventory.id,
      productId: product.id,
      physicalStock: inventory.currentStock,
      reservedStock: inventory.reservedStock,
      availableStock: inventory.availableStock,
      minimumStock: inventory.minimumStock,
      maximumStock: inventory.maximumStock || 0,
      reorderPoint: inventory.reorderPoint || 0,
      location: inventory.location,
      status: this.getStockStatus(inventory),
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category ? (await product.category).name : undefined,
      },
      movementsCount,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
    };
  }

  /**
   * Get paginated inventory list
   */
  async getInventoryList(
    queryDto: InventoryQueryDto,
  ): Promise<PaginatedResponseDto<InventoryResponseDto>> {
    const {
      page = 1,
      limit = 20,
      productId,
      location,
      status,
      minStock,
      maxStock,
      search,
    } = queryDto;

    const queryBuilder = this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoin('product.category', 'category');

    // Apply filters
    if (productId) {
      queryBuilder.andWhere('inventory.productId = :productId', { productId });
    }

    if (location) {
      queryBuilder.andWhere('inventory.location = :location', { location });
    }

    if (minStock !== undefined) {
      queryBuilder.andWhere('(inventory.currentStock - inventory.reservedStock) >= :minStock', {
        minStock,
      });
    }

    if (maxStock !== undefined) {
      queryBuilder.andWhere('(inventory.currentStock - inventory.reservedStock) <= :maxStock', {
        maxStock,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.sku ILIKE :search OR inventory.sku ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      // This is a simplified status filter - in reality you'd need more complex logic
      switch (status) {
        case 'OUT_OF_STOCK':
          queryBuilder.andWhere('(inventory.currentStock - inventory.reservedStock) <= 0');
          break;
        case 'LOW_STOCK':
          queryBuilder.andWhere(
            '(inventory.currentStock - inventory.reservedStock) <= inventory.minimumStock',
          );
          break;
        case 'IN_STOCK':
          queryBuilder.andWhere(
            '(inventory.currentStock - inventory.reservedStock) > inventory.minimumStock',
          );
          break;
      }
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.offset(offset).limit(limit);

    // Order by updated date descending
    queryBuilder.orderBy('inventory.updatedAt', 'DESC');

    const [inventories, totalItems] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);

    const data = await Promise.all(
      inventories.map(async (inventory) => {
        const product = await inventory.product;
        return {
          id: inventory.id,
          productId: product.id,
          physicalStock: inventory.currentStock,
          reservedStock: inventory.reservedStock,
          availableStock: inventory.availableStock,
          minimumStock: inventory.minimumStock,
          maximumStock: inventory.maximumStock || 0,
          reorderPoint: inventory.reorderPoint || 0,
          location: inventory.location,
          status: this.getStockStatus(inventory),
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            category: product.category ? (await product.category).name : undefined,
          },
          createdAt: inventory.createdAt,
          updatedAt: inventory.updatedAt,
        };
      }),
    );

    return {
      data,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Helper method to determine stock status
   */
  private getStockStatus(inventory: Inventory): string {
    return inventory.stockStatus;
  }

  /**
   * Get inventory statistics
   */
  async getInventoryStats(location?: string): Promise<{
    totalItems: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    statusBreakdown: {
      IN_STOCK: number;
      LOW_STOCK: number;
      OUT_OF_STOCK: number;
    };
  }> {
    const queryBuilder = this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product');

    if (location) {
      queryBuilder.andWhere('inventory.location = :location', { location });
    }

    const inventories = await queryBuilder.getMany();

    let totalItems = 0;
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let inStockCount = 0;

    for (const inventory of inventories) {
      totalItems++;
      const product = await inventory.product;
      totalValue += inventory.currentStock * product.price;

      const status = this.getStockStatus(inventory);
      switch (status) {
        case 'LOW_STOCK':
          lowStockCount++;
          break;
        case 'OUT_OF_STOCK':
          outOfStockCount++;
          break;
        default:
          inStockCount++;
      }
    }

    return {
      totalItems,
      totalValue: Math.round(totalValue * 100) / 100, // Round to 2 decimal places
      lowStockCount,
      outOfStockCount,
      statusBreakdown: {
        IN_STOCK: inStockCount,
        LOW_STOCK: lowStockCount,
        OUT_OF_STOCK: outOfStockCount,
      },
    };
  }

  /**
   * Helper method to get current user or default to system
   */
  private getCurrentUser(): string {
    // TODO: Implement actual user context extraction from JWT token
    // This should be injected from the authentication context
    // For now, return 'system' as placeholder until auth context is available
    return 'system';
  }

  /**
   * Helper method to map inventory entity to stock DTO
   */
  private async mapToStockDto(inventory: Inventory): Promise<InventoryStockDto> {
    const product = await inventory.product;

    return {
      productId: product.id,
      physicalStock: inventory.currentStock,
      reservedStock: inventory.reservedStock,
      availableStock: inventory.availableStock,
      minimumStock: inventory.minimumStock,
      maximumStock: inventory.maximumStock || 0,
      reorderPoint: inventory.reorderPoint || 0,
      location: inventory.location,
      lastUpdated: inventory.updatedAt,
      status: this.getStockStatus(inventory),
    };
  }
}
