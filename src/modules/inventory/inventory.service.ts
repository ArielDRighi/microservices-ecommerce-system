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
import { InventoryReservation, ReservationStatus } from './entities/inventory-reservation.entity';
import { InventoryMovementType } from './enums/inventory-movement-type.enum';
import { Product } from '../products/entities/product.entity';
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
  CreateInventoryDto,
  ReservationDetailsDto,
} from './dto';
import {
  DEFAULT_MINIMUM_STOCK,
  DEFAULT_REORDER_POINT_OFFSET,
  DEFAULT_MAXIMUM_STOCK_MULTIPLIER,
  DEFAULT_WAREHOUSE_LOCATION,
} from './constants/inventory.constants';

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
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly entityManager: EntityManager,
  ) {}

  /**
   * Create initial inventory record for a product
   * @param dto - Inventory creation data
   * @returns Created inventory record
   * @throws NotFoundException if product doesn't exist
   * @throws ConflictException if inventory already exists
   */
  async createInventory(dto: CreateInventoryDto): Promise<InventoryResponseDto> {
    this.logger.log(`Creating inventory for product ${dto.productId}`);

    // 1. Verify product exists
    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID ${dto.productId} not found. Cannot create inventory for non-existent product.`,
      );
    }

    // 2. Check if inventory already exists for this product + location
    const location = dto.location || DEFAULT_WAREHOUSE_LOCATION;
    const existingInventory = await this.inventoryRepository.findOne({
      where: {
        productId: dto.productId,
        location: location,
      },
    });

    if (existingInventory) {
      throw new ConflictException(
        `Inventory already exists for product ${dto.productId} at location ${location}. ` +
          `Use POST /inventory/add-stock to add stock to existing inventory.`,
      );
    }

    // 3. Create inventory record
    const inventory = this.inventoryRepository.create({
      productId: dto.productId,
      sku: dto.sku,
      location: location,
      currentStock: dto.initialStock,
      reservedStock: 0,
      minimumStock: dto.minimumStock ?? DEFAULT_MINIMUM_STOCK,
      maximumStock: dto.maximumStock ?? dto.initialStock * DEFAULT_MAXIMUM_STOCK_MULTIPLIER,
      reorderPoint:
        dto.reorderPoint ??
        (dto.minimumStock ?? DEFAULT_MINIMUM_STOCK) + DEFAULT_REORDER_POINT_OFFSET,
      reorderQuantity: dto.reorderQuantity ?? dto.initialStock,
      isActive: true,
      autoReorderEnabled: false,
      notes: dto.notes,
      lastRestockAt: new Date(),
    });

    const savedInventory = await this.inventoryRepository.save(inventory);

    // 4. Create initial stock movement (RESTOCK)
    await this.createStockMovement({
      inventoryId: savedInventory.id,
      movementType: InventoryMovementType.RESTOCK,
      quantity: dto.initialStock,
      stockBefore: 0,
      stockAfter: dto.initialStock,
      reason: dto.notes || 'Initial inventory creation',
      performedBy: 'system',
    });

    this.logger.log(
      `✅ Inventory created successfully: ${savedInventory.id} (${dto.initialStock} units)`,
    );

    // 5. Map to response DTO
    // Category already loaded via relations in findOne query
    const categoryName = product.category ? product.category.name : undefined;

    return {
      id: savedInventory.id,
      productId: product.id,
      physicalStock: savedInventory.currentStock,
      reservedStock: savedInventory.reservedStock,
      availableStock: savedInventory.availableStock,
      minimumStock: savedInventory.minimumStock,
      maximumStock: savedInventory.maximumStock || 0,
      reorderPoint: savedInventory.reorderPoint || 0,
      location: savedInventory.location,
      status: this.getStockStatus(savedInventory),
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: categoryName,
      },
      movementsCount: 1, // Initial movement just created
      createdAt: savedInventory.createdAt,
      updatedAt: savedInventory.updatedAt,
    };
  }

  /**
   * Get detailed information about a reservation
   * @param reservationId - Reservation identifier
   * @returns Reservation details with status and expiration info
   * @throws NotFoundException if reservation doesn't exist
   */
  async getReservationDetails(reservationId: string): Promise<ReservationDetailsDto> {
    this.logger.log(`Fetching details for reservation ${reservationId}`);

    const reservation = await this.reservationRepository.findOne({
      where: { reservationId },
      relations: ['inventory'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${reservationId} not found.`);
    }

    const now = new Date();
    const ttlSeconds = Math.floor((reservation.expiresAt.getTime() - now.getTime()) / 1000);
    const isExpired = ttlSeconds < 0;

    // Determine if reservation can be released or fulfilled
    const canBeReleased = reservation.status === ReservationStatus.ACTIVE && !isExpired;

    const canBeFulfilled = reservation.status === ReservationStatus.ACTIVE && !isExpired;

    return {
      reservationId: reservation.reservationId,
      productId: reservation.productId,
      inventoryId: reservation.inventoryId,
      quantity: reservation.quantity,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      ttlSeconds,
      isExpired,
      canBeReleased,
      canBeFulfilled,
      createdAt: reservation.createdAt,
      orderId: reservation.referenceId,
      reason: reservation.reason,
      location: reservation.location,
    };
  }

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

      // Create reservation record in database
      const reservation = this.reservationRepository.create({
        reservationId,
        productId,
        inventoryId: inventory.id,
        quantity,
        location,
        status: ReservationStatus.ACTIVE,
        referenceId,
        reason,
        expiresAt,
      });

      await manager.save(reservation);

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
   * Release a reservation back to available stock (IMPROVED)
   * @param releaseDto - Release reservation data
   * @returns Updated inventory stock info
   * @throws NotFoundException if reservation doesn't exist
   * @throws BadRequestException if reservation cannot be released
   */
  async releaseReservation(releaseDto: ReleaseReservationDto): Promise<InventoryStockDto> {
    const { productId, quantity, reservationId, location = 'MAIN_WAREHOUSE', reason } = releaseDto;

    this.logger.debug(`Releasing reservation: ${reservationId} for product ${productId}`);

    return await this.entityManager.transaction(async (manager) => {
      // 1. Find reservation first to validate status
      const reservation = await manager.findOne(InventoryReservation, {
        where: { reservationId },
        relations: ['inventory'],
      });

      if (!reservation) {
        throw new NotFoundException(
          `Reservation ${reservationId} not found. It may have been already released or expired.`,
        );
      }

      // 2. Validate reservation status
      if (reservation.status !== ReservationStatus.ACTIVE) {
        throw new BadRequestException(
          `Cannot release reservation in status ${reservation.status}. ` +
            `Only ACTIVE reservations can be released. ` +
            `Current status: ${reservation.status}`,
        );
      }

      // 3. Check if expired
      const now = new Date();
      if (reservation.expiresAt < now) {
        throw new BadRequestException(
          `Reservation ${reservationId} has already expired at ${reservation.expiresAt.toISOString()}. ` +
            `Expired reservations are automatically released by the system.`,
        );
      }

      // 4. Get inventory with lock (no relations to avoid LEFT JOIN + FOR UPDATE error)
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

      // 5. Release stock (decrement reserved, keep current stock the same)
      const beforeStock = inventory.currentStock;
      try {
        inventory.releaseReservedStock(quantity);
        await manager.save(inventory);
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Failed to release reservation',
        );
      }

      // 6. Update reservation status
      reservation.status = ReservationStatus.RELEASED;
      await manager.save(reservation);

      // 7. Create movement record
      const movement = this.movementRepository.create({
        inventoryId: inventory.id,
        movementType: InventoryMovementType.RELEASE_RESERVATION,
        quantity: quantity, // Positive because stock is being released
        stockBefore: beforeStock,
        stockAfter: inventory.currentStock,
        referenceId: reservationId,
        referenceType: 'RESERVATION_RELEASE',
        reason: reason || `Released reservation ${reservationId}`,
        performedBy: this.getCurrentUser(),
      });

      await manager.save(movement);

      // TODO: Remove from Redis
      // await this.redisService.removeReservation(reservationId);

      this.logger.debug(
        `✅ Reservation ${reservationId} released: ${quantity} units returned to available stock`,
      );

      return this.mapToStockDto(inventory);
    });
  }

  /**
   * Fulfill a reservation (convert to actual sale/usage) - IMPROVED
   * @param fulfillDto - Fulfill reservation data
   * @returns Updated inventory stock info
   * @throws NotFoundException if reservation doesn't exist
   * @throws BadRequestException if reservation cannot be fulfilled
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
      // 1. Find reservation first to validate status
      const reservation = await manager.findOne(InventoryReservation, {
        where: { reservationId },
        relations: ['inventory'],
      });

      if (!reservation) {
        throw new NotFoundException(
          `Reservation ${reservationId} not found. It may have been already fulfilled or expired.`,
        );
      }

      // 2. Validate reservation status
      if (reservation.status !== ReservationStatus.ACTIVE) {
        throw new BadRequestException(
          `Cannot fulfill reservation in status ${reservation.status}. ` +
            `Only ACTIVE reservations can be fulfilled. ` +
            `Current status: ${reservation.status}`,
        );
      }

      // 3. Check if expired
      const now = new Date();
      if (reservation.expiresAt < now) {
        throw new BadRequestException(
          `Reservation ${reservationId} has already expired at ${reservation.expiresAt.toISOString()}. ` +
            `Cannot fulfill expired reservations.`,
        );
      }

      // 4. Get inventory with lock (no relations to avoid LEFT JOIN + FOR UPDATE error)
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

      // 5. Fulfill reservation (decrement both reserved and current stock)
      const beforeStock = inventory.currentStock;
      try {
        inventory.fulfillReservation(quantity);
        await manager.save(inventory);
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Failed to fulfill reservation',
        );
      }

      // 6. Update reservation status
      reservation.status = ReservationStatus.FULFILLED;
      reservation.referenceId = orderId;
      await manager.save(reservation);

      // 7. Create movement record
      const movement = this.movementRepository.create({
        inventoryId: inventory.id,
        movementType: InventoryMovementType.SALE,
        quantity: -quantity, // Negative because stock is being consumed
        stockBefore: beforeStock,
        stockAfter: inventory.currentStock,
        referenceId: orderId,
        referenceType: 'ORDER',
        reason: notes || `Fulfilled reservation ${reservationId} for order ${orderId}`,
        performedBy: this.getCurrentUser(),
      });

      await manager.save(movement);

      // TODO: Remove from Redis
      // await this.redisService.removeReservation(reservationId);

      this.logger.debug(
        `✅ Reservation ${reservationId} fulfilled: ${quantity} units sold for order ${orderId}`,
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

    // Load category if not already loaded
    const category = product.category ? await product.category : null;
    const categoryName = category ? category.name : undefined;

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
        category: categoryName,
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

    const items = await Promise.all(
      inventories.map(async (inventory) => {
        const product = await inventory.product;
        // Load category if not already loaded
        const category = product.category ? await product.category : null;
        const categoryName = category ? category.name : undefined;

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
            category: categoryName,
          },
          createdAt: inventory.createdAt,
          updatedAt: inventory.updatedAt,
        };
      }),
    );

    return {
      items,
      meta: {
        page,
        limit,
        total: totalItems,
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
   * Helper method to create stock movement record
   * @private
   */
  private async createStockMovement(data: {
    inventoryId: string;
    movementType: InventoryMovementType;
    quantity: number;
    stockBefore: number;
    stockAfter: number;
    reason?: string;
    performedBy?: string;
    referenceId?: string;
    referenceType?: string;
  }): Promise<void> {
    const movement = this.movementRepository.create({
      inventoryId: data.inventoryId,
      movementType: data.movementType,
      quantity: data.quantity,
      stockBefore: data.stockBefore,
      stockAfter: data.stockAfter,
      reason: data.reason,
      performedBy: data.performedBy || 'system',
      referenceId: data.referenceId,
      referenceType: data.referenceType,
    });

    await this.movementRepository.save(movement);
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
