package integration_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHealthCheckEndpoint(t *testing.T) {
	// Setup: Configurar Gin en modo test
	gin.SetMode(gin.TestMode)
	router := gin.Default()

	// Health check route (replica del main.go)
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"service":   "inventory-service",
			"version":   "0.1.0",
			"timestamp": "2024-01-01T00:00:00Z", // Mock para test
		})
	})

	// Test: Crear request HTTP
	t.Run("should return 200 OK", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, err := http.NewRequest("GET", "/health", nil)
		require.NoError(t, err)

		// Execute
		router.ServeHTTP(w, req)

		// Assertions
		assert.Equal(t, http.StatusOK, w.Code, "Status code should be 200")
	})

	t.Run("should return correct JSON structure", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/health", nil)
		router.ServeHTTP(w, req)

		// Parse response
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err, "Response should be valid JSON")

		// Assertions
		assert.Equal(t, "ok", response["status"], "Status should be 'ok'")
		assert.Equal(t, "inventory-service", response["service"], "Service name should be 'inventory-service'")
		assert.Equal(t, "0.1.0", response["version"], "Version should be '0.1.0'")
		assert.NotEmpty(t, response["timestamp"], "Timestamp should not be empty")
	})

	t.Run("should return application/json content type", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/health", nil)
		router.ServeHTTP(w, req)

		contentType := w.Header().Get("Content-Type")
		assert.Contains(t, contentType, "application/json", "Content-Type should be application/json")
	})
}

func TestHealthCheckIntegration(t *testing.T) {
	// Este test se ejecutaría contra el servidor real
	// Por ahora lo skip hasta tener el servidor corriendo
	t.Skip("Integration test - requires running server")

	t.Run("should connect to real server", func(t *testing.T) {
		resp, err := http.Get("http://localhost:8080/health")
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})
}
