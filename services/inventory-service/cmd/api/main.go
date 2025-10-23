package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/application/usecase"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/config"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/database"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/persistence/repository"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/repository/stub"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/scheduler"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/interfaces/http/handler"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/interfaces/http/middleware"
)

func main() {
	// 1. Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// 2. Load configuration
	var cfg config.Config
	if err := envconfig.Process("", &cfg); err != nil {
		log.Fatalf("Error loading config: %v", err)
	}

	port := getEnv("PORT", "8080")
	schedulerIntervalMinutes := getEnvAsInt("SCHEDULER_INTERVAL_MINUTES", 10)
	env := getEnv("ENV", "development")
	serviceAPIKeys := getEnv("SERVICE_API_KEYS", "")

	// Validate that API keys are configured in production
	if env == "production" && serviceAPIKeys == "" {
		log.Fatal("SERVICE_API_KEYS must be configured in production environment")
	}

	// 3. Connect to PostgreSQL
	db, err := database.NewPostgresDB(&cfg.Database, env)
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}
	log.Println("Successfully connected to PostgreSQL")

	// 4. Initialize repositories (PostgreSQL implementations)
	inventoryRepo := repository.NewInventoryRepository(db)
	reservationRepo := repository.NewReservationRepository(db)
	dlqRepo := stub.NewDLQRepositoryStub() // TODO: Replace with PostgreSQL implementation in Epic 3.5

	// 3. Initialize use cases
	// Note: Publisher is nil for now (will be integrated with RabbitMQ later)
	releaseExpiredUseCase := usecase.NewReleaseExpiredReservationsUseCase(inventoryRepo, reservationRepo, nil)
	listDLQMessagesUseCase := usecase.NewListDLQMessagesUseCase(dlqRepo)
	getDLQCountUseCase := usecase.NewGetDLQCountUseCase(dlqRepo)
	retryDLQMessageUseCase := usecase.NewRetryDLQMessageUseCase(dlqRepo)

	// 4. Initialize handlers
	reservationMaintenanceHandler := handler.NewReservationMaintenanceHandler(releaseExpiredUseCase)
	dlqAdminHandler := handler.NewDLQAdminHandler(listDLQMessagesUseCase, getDLQCountUseCase, retryDLQMessageUseCase)

	// 5. Initialize scheduler
	schedulerInterval := time.Duration(schedulerIntervalMinutes) * time.Minute
	reservationScheduler := scheduler.NewReservationScheduler(releaseExpiredUseCase, schedulerInterval)

	// 6. Configurar Gin
	gin.SetMode(getEnv("GIN_MODE", gin.DebugMode))
	router := gin.Default()

	// 7. Health check básico (public endpoint - no auth required)
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"service":   "inventory-service",
			"version":   "0.1.0",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	})

	// 8. Prometheus metrics endpoint (public endpoint - no auth required)
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// 9. Ruta de bienvenida (public endpoint - no auth required)
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Inventory Service API",
			"version": "0.1.0",
			"docs":    "/api/docs",
		})
	})

	// 10. Protected API routes (service-to-service authentication required)
	// All /api/* and /admin/* routes require valid API key
	if serviceAPIKeys != "" {
		apiGroup := router.Group("/api")
		apiGroup.Use(middleware.ServiceAuthMiddleware(serviceAPIKeys))
		// TODO: Register API endpoints here in future tasks

		adminGroup := router.Group("/admin")
		adminGroup.Use(middleware.ServiceAuthMiddleware(serviceAPIKeys))
		{
			// T3.3.1 - Reservation maintenance
			adminGroup.POST("/reservations/release-expired", reservationMaintenanceHandler.ReleaseExpired)

			// T3.3.3 - DLQ management
			adminGroup.GET("/dlq", dlqAdminHandler.ListDLQMessages)
			adminGroup.GET("/dlq/count", dlqAdminHandler.GetDLQCount)
			adminGroup.POST("/dlq/:id/retry", dlqAdminHandler.RetryMessage)
		}
		log.Println("🔒 Service-to-Service authentication enabled for /api and /admin routes")
	} else {
		// Development mode: admin endpoints without authentication
		adminGroup := router.Group("/admin")
		{
			adminGroup.POST("/reservations/release-expired", reservationMaintenanceHandler.ReleaseExpired)
			adminGroup.GET("/dlq", dlqAdminHandler.ListDLQMessages)
			adminGroup.GET("/dlq/count", dlqAdminHandler.GetDLQCount)
			adminGroup.POST("/dlq/:id/retry", dlqAdminHandler.RetryMessage)
		}
		log.Println("⚠️  WARNING: Running without service authentication (development mode)")
	}

	// 11. Start scheduler (T3.3.1 - auto-release expired reservations)
	reservationScheduler.Start()
	log.Printf("🔄 Reservation scheduler started (interval: %d minutes)", schedulerIntervalMinutes)

	// 12. Configurar servidor HTTP
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// 13. Iniciar servidor en goroutine
	go func() {
		log.Printf("🚀 Starting Inventory Service on port %s", port)
		log.Printf("📊 Health check: http://localhost:%s/health", port)
		log.Printf("📈 Metrics endpoint: http://localhost:%s/metrics", port)
		log.Printf("🔧 Admin endpoints:")
		log.Printf("   POST http://localhost:%s/admin/reservations/release-expired", port)
		log.Printf("   GET  http://localhost:%s/admin/dlq", port)
		log.Printf("   GET  http://localhost:%s/admin/dlq/count", port)
		log.Printf("   POST http://localhost:%s/admin/dlq/:id/retry", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ Server failed to start: %v", err)
		}
	}()

	// 14. Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("⏳ Shutting down server...")
	log.Println("⏳ Stopping scheduler...")
	reservationScheduler.Stop()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("❌ Server forced to shutdown: %v", err)
	}

	// Close database connection
	log.Println("⏳ Closing database connection...")
	if err := database.CloseDB(db); err != nil {
		log.Printf("⚠️  Error closing database: %v", err)
	} else {
		log.Println("✅ Database connection closed")
	}

	log.Println("✅ Server exited gracefully")
}

// getEnv obtiene una variable de entorno o retorna un valor por defecto
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt obtiene una variable de entorno como int o retorna un valor por defecto
// Si la variable existe pero no puede parsearse, loguea un warning para facilitar troubleshooting
func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		intValue, err := strconv.Atoi(value)
		if err != nil {
			log.Printf("Warning: Invalid value for %s: '%s' (error: %v), using default: %d", key, value, err, defaultValue)
			return defaultValue
		}
		return intValue
	}
	return defaultValue
}
