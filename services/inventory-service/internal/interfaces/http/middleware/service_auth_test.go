package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServiceAuthMiddleware(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	validAPIKey := "test-service-api-key-12345"

	tests := []struct {
		name               string
		apiKey             string
		headerName         string
		expectedStatusCode int
		expectedBodyPart   string
	}{
		{
			name:               "Valid API key in X-API-Key header",
			apiKey:             validAPIKey,
			headerName:         "X-API-Key",
			expectedStatusCode: http.StatusOK,
			expectedBodyPart:   "success",
		},
		{
			name:               "Valid API key in Authorization header as Bearer",
			apiKey:             "Bearer " + validAPIKey,
			headerName:         "Authorization",
			expectedStatusCode: http.StatusOK,
			expectedBodyPart:   "success",
		},
		{
			name:               "Missing API key",
			apiKey:             "",
			headerName:         "X-API-Key",
			expectedStatusCode: http.StatusUnauthorized,
			expectedBodyPart:   "Missing API key",
		},
		{
			name:               "Invalid API key",
			apiKey:             "invalid-key",
			headerName:         "X-API-Key",
			expectedStatusCode: http.StatusUnauthorized,
			expectedBodyPart:   "Invalid API key",
		},
		{
			name:               "Empty Authorization header",
			apiKey:             "",
			headerName:         "Authorization",
			expectedStatusCode: http.StatusUnauthorized,
			expectedBodyPart:   "Missing API key",
		},
		{
			name:               "Invalid Bearer token",
			apiKey:             "Bearer wrong-key",
			headerName:         "Authorization",
			expectedStatusCode: http.StatusUnauthorized,
			expectedBodyPart:   "Invalid API key",
		},
		{
			name:               "Malformed Authorization header (no Bearer prefix)",
			apiKey:             "SomeOtherScheme token",
			headerName:         "Authorization",
			expectedStatusCode: http.StatusUnauthorized,
			expectedBodyPart:   "Invalid API key format",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup router with middleware
			router := gin.New()
			router.Use(ServiceAuthMiddleware(validAPIKey))

			// Test endpoint
			router.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			// Create request
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			if tt.apiKey != "" {
				req.Header.Set(tt.headerName, tt.apiKey)
			}

			// Execute request
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Assertions
			assert.Equal(t, tt.expectedStatusCode, w.Code)
			assert.Contains(t, w.Body.String(), tt.expectedBodyPart)
		})
	}
}

func TestServiceAuthMiddleware_MultipleValidKeys(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Multiple valid API keys (comma-separated)
	validKeys := "key1,key2,key3"

	tests := []struct {
		name               string
		apiKey             string
		expectedStatusCode int
	}{
		{
			name:               "First valid key",
			apiKey:             "key1",
			expectedStatusCode: http.StatusOK,
		},
		{
			name:               "Second valid key",
			apiKey:             "key2",
			expectedStatusCode: http.StatusOK,
		},
		{
			name:               "Third valid key",
			apiKey:             "key3",
			expectedStatusCode: http.StatusOK,
		},
		{
			name:               "Invalid key",
			apiKey:             "invalid",
			expectedStatusCode: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.Use(ServiceAuthMiddleware(validKeys))

			router.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			req.Header.Set("X-API-Key", tt.apiKey)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatusCode, w.Code)
		})
	}
}

func TestServiceAuthMiddleware_PublicEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)
	validAPIKey := "test-key"

	router := gin.New()

	// Public routes (no auth required)
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	router.GET("/metrics", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"metrics": "data"})
	})

	// Protected routes (auth required)
	protected := router.Group("/api")
	protected.Use(ServiceAuthMiddleware(validAPIKey))
	protected.GET("/inventory", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"data": "inventory"})
	})

	tests := []struct {
		name               string
		path               string
		apiKey             string
		expectedStatusCode int
	}{
		{
			name:               "Public /health endpoint without API key",
			path:               "/health",
			apiKey:             "",
			expectedStatusCode: http.StatusOK,
		},
		{
			name:               "Public /metrics endpoint without API key",
			path:               "/metrics",
			apiKey:             "",
			expectedStatusCode: http.StatusOK,
		},
		{
			name:               "Protected endpoint without API key",
			path:               "/api/inventory",
			apiKey:             "",
			expectedStatusCode: http.StatusUnauthorized,
		},
		{
			name:               "Protected endpoint with valid API key",
			path:               "/api/inventory",
			apiKey:             validAPIKey,
			expectedStatusCode: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			if tt.apiKey != "" {
				req.Header.Set("X-API-Key", tt.apiKey)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			require.Equal(t, tt.expectedStatusCode, w.Code, "Status code mismatch for path: %s", tt.path)
		})
	}
}

func TestServiceAuthMiddleware_SourceServiceHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	validAPIKey := "test-key"

	router := gin.New()
	router.Use(ServiceAuthMiddleware(validAPIKey))

	// Endpoint that reads the source service
	router.GET("/test", func(c *gin.Context) {
		sourceService := c.GetString("source_service")
		c.JSON(http.StatusOK, gin.H{"source_service": sourceService})
	})

	tests := []struct {
		name                  string
		apiKey                string
		sourceServiceHeader   string
		expectedStatusCode    int
		expectedSourceService string
	}{
		{
			name:                  "Valid API key with source service",
			apiKey:                validAPIKey,
			sourceServiceHeader:   "orders-service",
			expectedStatusCode:    http.StatusOK,
			expectedSourceService: "orders-service",
		},
		{
			name:                  "Valid API key without source service header",
			apiKey:                validAPIKey,
			sourceServiceHeader:   "",
			expectedStatusCode:    http.StatusOK,
			expectedSourceService: "unknown",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			req.Header.Set("X-API-Key", tt.apiKey)
			if tt.sourceServiceHeader != "" {
				req.Header.Set("X-Source-Service", tt.sourceServiceHeader)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatusCode, w.Code)
			if w.Code == http.StatusOK {
				assert.Contains(t, w.Body.String(), tt.expectedSourceService)
			}
		})
	}
}
