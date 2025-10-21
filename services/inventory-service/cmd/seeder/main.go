package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/persistence/model"
)

const (
	// DatasetDev seeds 100 products with balanced stock levels
	DatasetDev = "dev"
	// DatasetTest seeds 20 products for testing scenarios
	DatasetTest = "test"
	// DatasetDemo seeds 10 products with extreme scenarios (low stock, high stock, etc.)
	DatasetDemo = "demo"
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

// Seeder handles seeding operations
type Seeder struct {
	ordersDB    *gorm.DB
	inventoryDB *gorm.DB
	dataset     string
}

// ProductRecord represents a product from Orders Service
type ProductRecord struct {
	ID    uuid.UUID `gorm:"column:id;type:uuid"`
	Name  string    `gorm:"column:name"`
	SKU   string    `gorm:"column:sku"`
	Price float64   `gorm:"column:price"`
}

func (ProductRecord) TableName() string {
	return "products"
}

// NewSeeder creates a new seeder instance
func NewSeeder(ordersDB, inventoryDB *gorm.DB, dataset string) *Seeder {
	return &Seeder{
		ordersDB:    ordersDB,
		inventoryDB: inventoryDB,
		dataset:     dataset,
	}
}

// Seed executes the seeding process
func (s *Seeder) Seed(ctx context.Context) error {
	log.Printf("Starting seed process with dataset: %s", s.dataset)

	// Step 1: Fetch products from Orders Service
	products, err := s.fetchProducts(ctx)
	if err != nil {
		return fmt.Errorf("failed to fetch products: %w", err)
	}

	if len(products) == 0 {
		return fmt.Errorf("no products found in Orders Service database")
	}

	log.Printf("Found %d products in Orders Service", len(products))

	// Step 2: Clear existing inventory data
	if err := s.clearInventory(ctx); err != nil {
		return fmt.Errorf("failed to clear inventory: %w", err)
	}

	// Step 3: Create inventory items based on dataset
	inventoryItems := s.generateInventoryItems(products)

	// Step 4: Insert inventory items
	if err := s.insertInventoryItems(ctx, inventoryItems); err != nil {
		return fmt.Errorf("failed to insert inventory items: %w", err)
	}

	log.Printf("Successfully seeded %d inventory items", len(inventoryItems))
	return nil
}

// fetchProducts retrieves products from Orders Service database
func (s *Seeder) fetchProducts(ctx context.Context) ([]ProductRecord, error) {
	var products []ProductRecord

	limit := s.getProductLimit()
	result := s.ordersDB.WithContext(ctx).
		Where("is_active = ?", true).
		Where("deleted_at IS NULL").
		Order("created_at DESC").
		Limit(limit).
		Find(&products)

	if result.Error != nil {
		return nil, result.Error
	}

	return products, nil
}

// clearInventory removes all existing inventory items
func (s *Seeder) clearInventory(ctx context.Context) error {
	// Delete all reservations first (FK constraint)
	if err := s.inventoryDB.WithContext(ctx).
		Exec("DELETE FROM reservations").Error; err != nil {
		return fmt.Errorf("failed to delete reservations: %w", err)
	}

	// Delete all inventory items
	if err := s.inventoryDB.WithContext(ctx).
		Exec("DELETE FROM inventory_items").Error; err != nil {
		return fmt.Errorf("failed to delete inventory_items: %w", err)
	}

	log.Println("Cleared existing inventory data")
	return nil
}

// generateInventoryItems creates inventory items based on dataset type
func (s *Seeder) generateInventoryItems(products []ProductRecord) []model.InventoryItemModel {
	items := make([]model.InventoryItemModel, 0, len(products))
	now := time.Now()
	rnd := rand.New(rand.NewSource(time.Now().UnixNano()))

	for _, product := range products {
		var quantity, reserved int

		switch s.dataset {
		case DatasetDev:
			quantity = s.generateDevQuantity(rnd)
			reserved = s.generateDevReserved(rnd, quantity)
		case DatasetTest:
			quantity = s.generateTestQuantity(rnd)
			reserved = 0 // No reservations in test data
		case DatasetDemo:
			quantity = s.generateDemoQuantity(rnd)
			reserved = s.generateDemoReserved(rnd, quantity)
		default:
			quantity = 100
			reserved = 0
		}

		item := model.InventoryItemModel{
			ID:        uuid.New(),
			ProductID: product.ID,
			Quantity:  quantity,
			Reserved:  reserved,
			Version:   1,
			CreatedAt: now,
			UpdatedAt: now,
		}

		items = append(items, item)
	}

	return items
}

// insertInventoryItems inserts inventory items in batch
func (s *Seeder) insertInventoryItems(ctx context.Context, items []model.InventoryItemModel) error {
	batchSize := 50
	for i := 0; i < len(items); i += batchSize {
		end := i + batchSize
		if end > len(items) {
			end = len(items)
		}

		batch := items[i:end]
		if err := s.inventoryDB.WithContext(ctx).Create(&batch).Error; err != nil {
			return fmt.Errorf("failed to insert batch at index %d: %w", i, err)
		}

		log.Printf("Inserted batch %d-%d", i+1, end)
	}

	return nil
}

// getProductLimit returns the number of products to seed based on dataset
func (s *Seeder) getProductLimit() int {
	switch s.dataset {
	case DatasetDev:
		return 100
	case DatasetTest:
		return 20
	case DatasetDemo:
		return 10
	default:
		return 100
	}
}

// generateDevQuantity generates balanced stock levels for development
func (s *Seeder) generateDevQuantity(rnd *rand.Rand) int {
	// 20% low stock (1-9), 60% medium stock (10-100), 20% high stock (100-500)
	roll := rnd.Intn(100)
	if roll < 20 {
		return rnd.Intn(9) + 1 // 1-9
	} else if roll < 80 {
		return rnd.Intn(91) + 10 // 10-100
	} else {
		return rnd.Intn(401) + 100 // 100-500
	}
}

// generateDevReserved generates realistic reservations for development
func (s *Seeder) generateDevReserved(rnd *rand.Rand, quantity int) int {
	// Reserve 0-30% of quantity
	maxReserved := int(float64(quantity) * 0.3)
	if maxReserved <= 0 {
		return 0
	}
	return rnd.Intn(maxReserved + 1)
}

// generateTestQuantity generates predictable stock levels for testing
func (s *Seeder) generateTestQuantity(rnd *rand.Rand) int {
	// Mix of scenarios: 0, 1, 5, 10, 50, 100
	scenarios := []int{0, 1, 5, 10, 50, 100}
	return scenarios[rnd.Intn(len(scenarios))]
}

// generateDemoQuantity generates extreme scenarios for demo
func (s *Seeder) generateDemoQuantity(rnd *rand.Rand) int {
	// Extreme scenarios for demonstration
	scenarios := []int{
		0,    // Out of stock
		1,    // Last item
		5,    // Very low stock
		100,  // Medium stock
		1000, // High stock
	}
	return scenarios[rnd.Intn(len(scenarios))]
}

// generateDemoReserved generates reservations for demo scenarios
func (s *Seeder) generateDemoReserved(rnd *rand.Rand, quantity int) int {
	if quantity == 0 {
		return 0
	}
	// High reservation rate for demo (30-70%)
	minReserved := int(float64(quantity) * 0.3)
	maxReserved := int(float64(quantity) * 0.7)
	if maxReserved <= minReserved {
		return minReserved
	}
	return minReserved + rnd.Intn(maxReserved-minReserved+1)
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

func main() {
	// Parse command-line flags
	dataset := flag.String("dataset", DatasetDev, "Dataset type: dev, test, or demo")
	help := flag.Bool("help", false, "Show help message")
	flag.Parse()

	if *help {
		printHelp()
		os.Exit(0)
	}

	// Validate dataset
	if *dataset != DatasetDev && *dataset != DatasetTest && *dataset != DatasetDemo {
		log.Fatalf("Invalid dataset: %s. Must be one of: dev, test, demo", *dataset)
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

	// Create seeder and execute
	seeder := NewSeeder(ordersDB, inventoryDB, *dataset)
	ctx := context.Background()

	if err := seeder.Seed(ctx); err != nil {
		log.Fatalf("Seed failed: %v", err)
	}

	log.Println("✅ Seed completed successfully!")
}

func printHelp() {
	fmt.Print(`
Inventory Seeder - Seed inventory data from Orders Service products

Usage:
  go run cmd/seeder/main.go [options]

Options:
  -dataset string
        Dataset type to seed (default "dev")
        Values: dev, test, demo
  
  -help
        Show this help message

Datasets:
  dev   - Seeds 100 products with balanced stock levels
          20% low stock (1-9)
          60% medium stock (10-100)
          20% high stock (100-500)
          Reservations: 0-30% of quantity

  test  - Seeds 20 products with predictable scenarios
          Quantities: 0, 1, 5, 10, 50, 100
          No reservations

  demo  - Seeds 10 products with extreme scenarios
          Scenarios: out of stock (0), last item (1), 
                    very low (5), medium (100), high (1000)
          Reservations: 30-70% of quantity

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
  # Seed dev dataset
  go run cmd/seeder/main.go

  # Seed test dataset
  go run cmd/seeder/main.go -dataset=test

  # Seed demo dataset
  go run cmd/seeder/main.go -dataset=demo

  # With custom database
  ORDERS_DB_HOST=orders-db INVENTORY_DB_HOST=inventory-db \
    go run cmd/seeder/main.go -dataset=dev
`)
}
