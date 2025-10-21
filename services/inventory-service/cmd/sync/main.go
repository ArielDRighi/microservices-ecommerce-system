package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/persistence/model"
)

// Config holds database configuration
type Config struct {
	OrdersDBHost     string
	OrdersDBPort     string
	OrdersDBUser     string
	OrdersDBPassword string
	OrdersDBName     string

	InventoryDBHost     string
	InventoryDBPort     string
	InventoryDBUser     string
	InventoryDBPassword string
	InventoryDBName     string
}

// Synchronizer handles product synchronization operations
type Synchronizer struct {
	ordersDB        *gorm.DB
	inventoryDB     *gorm.DB
	defaultQuantity int
	dryRun          bool
}

// ProductRecord represents a product from Orders Service
type ProductRecord struct {
	ID        uuid.UUID `gorm:"column:id;type:uuid"`
	Name      string    `gorm:"column:name"`
	SKU       string    `gorm:"column:sku"`
	Price     float64   `gorm:"column:price"`
	IsActive  bool      `gorm:"column:is_active"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (ProductRecord) TableName() string {
	return "products"
}

// SyncResult holds synchronization statistics
type SyncResult struct {
	TotalProducts   int
	NewItems        int
	ExistingItems   int
	SkippedInactive int
	Errors          int
	Duration        time.Duration
}

// NewSynchronizer creates a new synchronizer instance
func NewSynchronizer(ordersDB, inventoryDB *gorm.DB, defaultQuantity int, dryRun bool) *Synchronizer {
	return &Synchronizer{
		ordersDB:        ordersDB,
		inventoryDB:     inventoryDB,
		defaultQuantity: defaultQuantity,
		dryRun:          dryRun,
	}
}

// Sync executes the synchronization process
func (s *Synchronizer) Sync(ctx context.Context) (*SyncResult, error) {
	startTime := time.Now()
	log.Println("Starting product synchronization...")

	if s.dryRun {
		log.Println("🔍 DRY RUN MODE - No changes will be made to database")
	}

	result := &SyncResult{}

	// Step 1: Fetch all products from Orders Service
	products, err := s.fetchProducts(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch products: %w", err)
	}

	result.TotalProducts = len(products)
	log.Printf("Found %d products in Orders Service", result.TotalProducts)

	if result.TotalProducts == 0 {
		return result, fmt.Errorf("no products found in Orders Service")
	}

	// Step 2: Get existing inventory product IDs
	existingProductIDs, err := s.getExistingProductIDs(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get existing inventory items: %w", err)
	}

	log.Printf("Found %d existing inventory items", len(existingProductIDs))

	// Step 3: Process each product
	for _, product := range products {
		if !product.IsActive {
			result.SkippedInactive++
			log.Printf("⏭️  Skipping inactive product: %s (SKU: %s)", product.Name, product.SKU)
			continue
		}

		exists := existingProductIDs[product.ID]
		if exists {
			result.ExistingItems++
			log.Printf("✅ Product already exists in inventory: %s (SKU: %s)", product.Name, product.SKU)
			continue
		}

		// Create new inventory item
		if err := s.createInventoryItem(ctx, product); err != nil {
			result.Errors++
			log.Printf("❌ Error creating inventory item for product %s: %v", product.Name, err)
			continue
		}

		result.NewItems++
		if s.dryRun {
			log.Printf("🔍 [DRY RUN] Would create inventory item for: %s (SKU: %s, Quantity: %d)",
				product.Name, product.SKU, s.defaultQuantity)
		} else {
			log.Printf("✨ Created inventory item for: %s (SKU: %s, Quantity: %d)",
				product.Name, product.SKU, s.defaultQuantity)
		}
	}

	result.Duration = time.Since(startTime)

	return result, nil
}

// fetchProducts retrieves all active products from Orders Service
func (s *Synchronizer) fetchProducts(ctx context.Context) ([]ProductRecord, error) {
	var products []ProductRecord

	result := s.ordersDB.WithContext(ctx).
		Where("deleted_at IS NULL").
		Order("created_at DESC").
		Find(&products)

	if result.Error != nil {
		return nil, result.Error
	}

	return products, nil
}

// getExistingProductIDs returns a map of existing product IDs in inventory
func (s *Synchronizer) getExistingProductIDs(ctx context.Context) (map[uuid.UUID]bool, error) {
	var items []model.InventoryItemModel

	result := s.inventoryDB.WithContext(ctx).
		Select("product_id").
		Find(&items)

	if result.Error != nil {
		return nil, result.Error
	}

	productIDs := make(map[uuid.UUID]bool, len(items))
	for _, item := range items {
		productIDs[item.ProductID] = true
	}

	return productIDs, nil
}

// createInventoryItem creates a new inventory item
func (s *Synchronizer) createInventoryItem(ctx context.Context, product ProductRecord) error {
	if s.dryRun {
		// Don't create in dry run mode
		return nil
	}

	now := time.Now()
	item := model.InventoryItemModel{
		ID:        uuid.New(),
		ProductID: product.ID,
		Quantity:  s.defaultQuantity,
		Reserved:  0,
		Version:   1,
		CreatedAt: now,
		UpdatedAt: now,
	}

	result := s.inventoryDB.WithContext(ctx).Create(&item)
	return result.Error
}

// ValidateBeforeSync performs pre-sync validation checks
func (s *Synchronizer) ValidateBeforeSync(ctx context.Context) error {
	log.Println("Running pre-sync validation checks...")

	// Check Orders DB connection
	if err := s.validateConnection(s.ordersDB, "Orders Service"); err != nil {
		return err
	}

	// Check Inventory DB connection
	if err := s.validateConnection(s.inventoryDB, "Inventory Service"); err != nil {
		return err
	}

	// Check if products table exists in Orders DB
	if !s.ordersDB.Migrator().HasTable("products") {
		return fmt.Errorf("products table not found in Orders Service database")
	}

	// Check if inventory_items table exists in Inventory DB
	if !s.inventoryDB.Migrator().HasTable("inventory_items") {
		return fmt.Errorf("inventory_items table not found in Inventory Service database. Please run migrations first")
	}

	log.Println("✅ All validation checks passed")
	return nil
}

// validateConnection checks database connection
func (s *Synchronizer) validateConnection(db *gorm.DB, serviceName string) error {
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("%s DB error: %w", serviceName, err)
	}

	if err := sqlDB.Ping(); err != nil {
		return fmt.Errorf("%s DB ping failed: %w", serviceName, err)
	}

	log.Printf("✅ %s database connection OK", serviceName)
	return nil
}

// LoadConfigFromEnv loads configuration from environment variables
func LoadConfigFromEnv() *Config {
	return &Config{
		OrdersDBHost:     getEnv("ORDERS_DB_HOST", "localhost"),
		OrdersDBPort:     getEnv("ORDERS_DB_PORT", "5433"),
		OrdersDBUser:     getEnv("ORDERS_DB_USER", "microservices_user"),
		OrdersDBPassword: getEnv("ORDERS_DB_PASSWORD", "microservices_pass_2024"),
		OrdersDBName:     getEnv("ORDERS_DB_NAME", "microservices_orders"),

		InventoryDBHost:     getEnv("INVENTORY_DB_HOST", "localhost"),
		InventoryDBPort:     getEnv("INVENTORY_DB_PORT", "5433"),
		InventoryDBUser:     getEnv("INVENTORY_DB_USER", "microservices_user"),
		InventoryDBPassword: getEnv("INVENTORY_DB_PASSWORD", "microservices_pass_2024"),
		InventoryDBName:     getEnv("INVENTORY_DB_NAME", "microservices_inventory"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// ConnectDB establishes database connection
func ConnectDB(host, port, user, password, dbname string) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

// PrintSummary prints synchronization summary
func PrintSummary(result *SyncResult) {
	separator := "============================================================"
	fmt.Println("\n" + separator)
	fmt.Println("📊 SYNCHRONIZATION SUMMARY")
	fmt.Println(separator)
	fmt.Printf("Total Products Found:     %d\n", result.TotalProducts)
	fmt.Printf("New Inventory Items:      %d ✨\n", result.NewItems)
	fmt.Printf("Already Existing:         %d ✅\n", result.ExistingItems)
	fmt.Printf("Skipped (Inactive):       %d ⏭️\n", result.SkippedInactive)
	fmt.Printf("Errors:                   %d ❌\n", result.Errors)
	fmt.Printf("Duration:                 %v\n", result.Duration.Round(time.Millisecond))
	fmt.Println(separator)

	successRate := float64(result.NewItems+result.ExistingItems) / float64(result.TotalProducts-result.SkippedInactive) * 100
	fmt.Printf("Success Rate:             %.1f%%\n", successRate)
	fmt.Println(separator + "\n")
}

func main() {
	// Parse command-line flags
	defaultQty := flag.Int("default-quantity", 100, "Default quantity for new inventory items")
	dryRun := flag.Bool("dry-run", false, "Run in dry-run mode (no database changes)")
	validate := flag.Bool("validate", true, "Run validation checks before sync")
	help := flag.Bool("help", false, "Show help message")
	flag.Parse()

	if *help {
		printHelp()
		os.Exit(0)
	}

	// Validate default quantity
	if *defaultQty < 0 {
		log.Fatalf("Invalid default-quantity: %d. Must be non-negative", *defaultQty)
	}

	// Load configuration
	config := LoadConfigFromEnv()

	// Connect to Orders Service database
	log.Println("Connecting to Orders Service database...")
	ordersDB, err := ConnectDB(
		config.OrdersDBHost,
		config.OrdersDBPort,
		config.OrdersDBUser,
		config.OrdersDBPassword,
		config.OrdersDBName,
	)
	if err != nil {
		log.Fatalf("Failed to connect to Orders DB: %v", err)
	}

	// Connect to Inventory Service database
	log.Println("Connecting to Inventory Service database...")
	inventoryDB, err := ConnectDB(
		config.InventoryDBHost,
		config.InventoryDBPort,
		config.InventoryDBUser,
		config.InventoryDBPassword,
		config.InventoryDBName,
	)
	if err != nil {
		log.Fatalf("Failed to connect to Inventory DB: %v", err)
	}

	// Create synchronizer
	sync := NewSynchronizer(ordersDB, inventoryDB, *defaultQty, *dryRun)
	ctx := context.Background()

	// Run validation if enabled
	if *validate {
		if err := sync.ValidateBeforeSync(ctx); err != nil {
			log.Fatalf("Validation failed: %v", err)
		}
	}

	// Execute synchronization
	result, err := sync.Sync(ctx)
	if err != nil {
		log.Fatalf("Synchronization failed: %v", err)
	}

	// Print summary
	PrintSummary(result)

	if *dryRun {
		log.Println("🔍 DRY RUN completed - No changes were made")
	} else {
		log.Println("✅ Synchronization completed successfully!")
	}
}

func printHelp() {
	fmt.Print(`
Product Synchronization Tool - Sync products from Orders to Inventory

Usage:
  go run cmd/sync/main.go [options]

Options:
  -default-quantity int
        Default quantity for new inventory items (default 100)
  
  -dry-run
        Run in dry-run mode without making database changes
  
  -validate
        Run validation checks before sync (default true)
  
  -help
        Show this help message

Description:
  This tool synchronizes products from Orders Service to Inventory Service.
  It creates inventory items for new products while preserving existing ones.
  
  Features:
  - Idempotent: Safe to run multiple times
  - Non-destructive: Never deletes existing inventory items
  - Validation: Checks database connections and schema before sync
  - Dry-run: Preview changes without applying them
  - Detailed logging: Track every sync operation
  - Error handling: Continues on individual product failures
  
  Use Cases:
  - Initial migration from monolith to microservices
  - Adding new products to inventory
  - Recovering from data loss
  - Regular synchronization jobs

Environment Variables:
  ORDERS_DB_HOST      (default: localhost)
  ORDERS_DB_PORT      (default: 5433)
  ORDERS_DB_USER      (default: microservices_user)
  ORDERS_DB_PASSWORD  (default: microservices_pass_2024)
  ORDERS_DB_NAME      (default: microservices_orders)

  INVENTORY_DB_HOST      (default: localhost)
  INVENTORY_DB_PORT      (default: 5433)
  INVENTORY_DB_USER      (default: microservices_user)
  INVENTORY_DB_PASSWORD  (default: microservices_pass_2024)
  INVENTORY_DB_NAME      (default: microservices_inventory)

Examples:
  # Dry run to preview changes
  go run cmd/sync/main.go -dry-run

  # Sync with default quantity of 50
  go run cmd/sync/main.go -default-quantity=50

  # Sync without validation (faster, use with caution)
  go run cmd/sync/main.go -validate=false

  # Full sync with custom database
  ORDERS_DB_HOST=orders-db INVENTORY_DB_HOST=inventory-db \
    go run cmd/sync/main.go

Important Notes:
  - Always run with -dry-run first to preview changes
  - Ensure migrations are applied to Inventory database
  - Inactive products are skipped automatically
  - Existing inventory items are never modified
  - Use default-quantity wisely (e.g., 0 for pre-order items)
`)
}
