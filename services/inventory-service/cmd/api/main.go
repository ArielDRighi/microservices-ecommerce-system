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
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/application/usecase"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/repository/stub"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/scheduler"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/interfaces/http/handler"
)

func main() {
	// 1. Cargar variables de entorno
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	port := getEnv("PORT", "8080")
	schedulerIntervalMinutes := getEnvAsInt("SCHEDULER_INTERVAL_MINUTES", 10)

	// 2. Initialize repositories (stub implementations for now)
	// TODO: Replace with real PostgreSQL implementations
	reservationRepo := stub.NewReservationRepositoryStub()
	inventoryRepo := stub.NewInventoryRepositoryStub()
	dlqRepo := stub.NewDLQRepositoryStub()

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

	// 7. Health check básico
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"service":   "inventory-service",
			"version":   "0.1.0",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	})

	// 8. Prometheus metrics endpoint
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// 9. Ruta de bienvenida
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Inventory Service API",
			"version": "0.1.0",
			"docs":    "/api/docs",
		})
	})

	// 10. Register admin endpoints (Epic 3.3)
	adminGroup := router.Group("/admin")
	{
		// T3.3.1 - Reservation maintenance
		adminGroup.POST("/reservations/release-expired", reservationMaintenanceHandler.ReleaseExpired)

		// T3.3.3 - DLQ management
		adminGroup.GET("/dlq", dlqAdminHandler.ListDLQMessages)
		adminGroup.GET("/dlq/count", dlqAdminHandler.GetDLQCount)
		adminGroup.POST("/dlq/:id/retry", dlqAdminHandler.RetryMessage)
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
func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
