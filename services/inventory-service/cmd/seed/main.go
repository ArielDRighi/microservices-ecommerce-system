package main

import (
	"context"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"
	"gorm.io/gorm"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/config"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/database"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/persistence/repository"
)

// SeedProduct represents a product for seeding
type SeedProduct struct {
	Name      string
	ProductID uuid.UUID
	Quantity  int
	Reserved  int
}

func main() {
	log.Println("🌱 Starting database seed process...")

	// 1. Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// 2. Load configuration
	var cfg config.Config
	if err := envconfig.Process("", &cfg); err != nil {
		log.Fatalf("Error loading config: %v", err)
	}

	env := "development"

	// 3. Connect to PostgreSQL
	db, err := database.NewPostgresDB(&cfg.Database, env)
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}
	defer database.CloseDB(db)

	log.Println("✅ Connected to PostgreSQL")

	// 4. Initialize repository
	inventoryRepo := repository.NewInventoryRepository(db)
	reservationRepo := repository.NewReservationRepository(db)

	// 5. Clear existing data (optional - for development/testing)
	log.Println("🗑️  Clearing existing data...")
	if err := clearExistingData(db); err != nil {
		log.Fatalf("Failed to clear existing data: %v", err)
	}

	// 6. Seed inventory items
	log.Println("📦 Seeding inventory items...")
	products := getRealisticProducts()
	ctx := context.Background()

	for _, p := range products {
		item, err := entity.NewInventoryItem(p.ProductID, p.Quantity)
		if err != nil {
			log.Printf("⚠️  Failed to create inventory item for %s: %v", p.Name, err)
			continue
		}

		// Apply reserved quantity if any
		if p.Reserved > 0 {
			if err := item.Reserve(p.Reserved); err != nil {
				log.Printf("⚠️  Failed to reserve stock for %s: %v", p.Name, err)
			}
		}

		if err := inventoryRepo.Save(ctx, item); err != nil {
			log.Printf("⚠️  Failed to save inventory item for %s: %v", p.Name, err)
			continue
		}

		log.Printf("  ✅ %s (ProductID: %s) - Quantity: %d, Reserved: %d, Available: %d",
			p.Name, p.ProductID, item.Quantity, item.Reserved, item.Available())
	}

	// 7. Seed some reservations
	log.Println("🔒 Seeding reservations...")
	if err := seedReservations(ctx, reservationRepo, products); err != nil {
		log.Printf("⚠️  Failed to seed reservations: %v", err)
	}

	log.Println("✅ Database seed completed successfully!")
	log.Printf("📊 Total items seeded: %d", len(products))
}

// getRealisticProducts returns a list of realistic products for seeding
func getRealisticProducts() []SeedProduct {
	return []SeedProduct{
		// Electronics (high value, moderate stock)
		{
			Name:      "iPhone 15 Pro Max",
			ProductID: uuid.MustParse("10000000-0000-0000-0000-000000000001"),
			Quantity:  50,
			Reserved:  5,
		},
		{
			Name:      "Samsung Galaxy S24 Ultra",
			ProductID: uuid.MustParse("10000000-0000-0000-0000-000000000002"),
			Quantity:  45,
			Reserved:  3,
		},
		{
			Name:      "MacBook Pro M3 16\"",
			ProductID: uuid.MustParse("10000000-0000-0000-0000-000000000003"),
			Quantity:  30,
			Reserved:  2,
		},
		{
			Name:      "Sony WH-1000XM5 Headphones",
			ProductID: uuid.MustParse("10000000-0000-0000-0000-000000000004"),
			Quantity:  100,
			Reserved:  10,
		},
		{
			Name:      "iPad Pro 12.9\"",
			ProductID: uuid.MustParse("10000000-0000-0000-0000-000000000005"),
			Quantity:  40,
			Reserved:  4,
		},

		// Clothing (high volume, high stock)
		{
			Name:      "Nike Air Max 2024",
			ProductID: uuid.MustParse("20000000-0000-0000-0000-000000000001"),
			Quantity:  200,
			Reserved:  20,
		},
		{
			Name:      "Levi's 501 Original Jeans",
			ProductID: uuid.MustParse("20000000-0000-0000-0000-000000000002"),
			Quantity:  150,
			Reserved:  15,
		},
		{
			Name:      "Patagonia Fleece Jacket",
			ProductID: uuid.MustParse("20000000-0000-0000-0000-000000000003"),
			Quantity:  80,
			Reserved:  8,
		},
		{
			Name:      "Adidas Ultraboost Running Shoes",
			ProductID: uuid.MustParse("20000000-0000-0000-0000-000000000004"),
			Quantity:  120,
			Reserved:  12,
		},
		{
			Name:      "The North Face Backpack",
			ProductID: uuid.MustParse("20000000-0000-0000-0000-000000000005"),
			Quantity:  90,
			Reserved:  9,
		},

		// Books (moderate price, very high stock)
		{
			Name:      "Clean Code by Robert Martin",
			ProductID: uuid.MustParse("30000000-0000-0000-0000-000000000001"),
			Quantity:  500,
			Reserved:  50,
		},
		{
			Name:      "Design Patterns: Elements of Reusable OO Software",
			ProductID: uuid.MustParse("30000000-0000-0000-0000-000000000002"),
			Quantity:  300,
			Reserved:  30,
		},
		{
			Name:      "The Pragmatic Programmer",
			ProductID: uuid.MustParse("30000000-0000-0000-0000-000000000003"),
			Quantity:  400,
			Reserved:  40,
		},

		// Edge cases for testing
		{
			Name:      "Limited Edition Collectible",
			ProductID: uuid.MustParse("99000000-0000-0000-0000-000000000001"),
			Quantity:  5,
			Reserved:  0,
		},
		{
			Name:      "Out of Stock Item",
			ProductID: uuid.MustParse("99000000-0000-0000-0000-000000000002"),
			Quantity:  0,
			Reserved:  0,
		},
		{
			Name:      "Fully Reserved Item",
			ProductID: uuid.MustParse("99000000-0000-0000-0000-000000000003"),
			Quantity:  10,
			Reserved:  10,
		},
		{
			Name:      "High Stock Warehouse Item",
			ProductID: uuid.MustParse("99000000-0000-0000-0000-000000000004"),
			Quantity:  10000,
			Reserved:  100,
		},
		{
			Name:      "Low Stock Alert Item",
			ProductID: uuid.MustParse("99000000-0000-0000-0000-000000000005"),
			Quantity:  3,
			Reserved:  0,
		},
	}
}

// seedReservations creates some sample reservations
func seedReservations(ctx context.Context, repo *repository.ReservationRepositoryImpl, products []SeedProduct) error {
	// Create reservations for products that have reserved quantity
	for _, p := range products {
		if p.Reserved > 0 {
			// Create a reservation expiring in 24 hours
			reservation := &entity.Reservation{
				ID:              uuid.New(),
				InventoryItemID: p.ProductID,
				OrderID:         uuid.New(),
				Quantity:        p.Reserved,
				Status:          entity.ReservationPending,
				ExpiresAt:       time.Now().Add(24 * time.Hour),
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			}

			if err := repo.Save(ctx, reservation); err != nil {
				return err
			}

			log.Printf("  ✅ Reservation created for %s - OrderID: %s, Quantity: %d",
				p.Name, reservation.OrderID, reservation.Quantity)
		}
	}

	// Add some expired reservations for testing cleanup
	expiredReservation := &entity.Reservation{
		ID:              uuid.New(),
		InventoryItemID: products[0].ProductID, // iPhone
		OrderID:         uuid.New(),
		Quantity:        2,
		Status:          entity.ReservationPending,
		ExpiresAt:       time.Now().Add(-1 * time.Hour), // Already expired
		CreatedAt:       time.Now().Add(-25 * time.Hour),
		UpdatedAt:       time.Now().Add(-25 * time.Hour),
	}

	if err := repo.Save(ctx, expiredReservation); err != nil {
		return err
	}

	log.Printf("  ✅ Expired reservation created for testing (OrderID: %s)", expiredReservation.OrderID)

	return nil
}

// clearExistingData removes all data from tables (for development/testing)
func clearExistingData(db *gorm.DB) error {
	// Delete in correct order to respect foreign key constraints
	queries := []string{
		"DELETE FROM reservations",
		"DELETE FROM inventory_items",
		"DELETE FROM dlq_messages",
	}

	for _, query := range queries {
		if err := db.Exec(query).Error; err != nil {
			return err
		}
	}

	return nil
}
