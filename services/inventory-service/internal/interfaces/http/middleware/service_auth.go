package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// ServiceAuthMiddleware validates service-to-service authentication using API keys.
// It supports two authentication methods:
//   1. X-API-Key header with the API key directly
//   2. Authorization header with "Bearer <api-key>" format
//
// The middleware also extracts the source service name from X-Source-Service header
// for logging and audit purposes.
//
// Parameters:
//   - validAPIKeys: Comma-separated list of valid API keys (e.g., "key1,key2,key3")
//
// Returns:
//   - gin.HandlerFunc: Middleware function for Gin router
//
// Example usage:
//
//	router := gin.Default()
//	apiKeys := os.Getenv("SERVICE_API_KEYS")
//	router.Use(ServiceAuthMiddleware(apiKeys))
func ServiceAuthMiddleware(validAPIKeys string) gin.HandlerFunc {
	// Parse valid API keys into a map for O(1) lookup
	validKeysMap := make(map[string]bool)
	keys := strings.Split(validAPIKeys, ",")
	for _, key := range keys {
		trimmedKey := strings.TrimSpace(key)
		if trimmedKey != "" {
			validKeysMap[trimmedKey] = true
		}
	}

	return func(c *gin.Context) {
		// Try to get API key from X-API-Key header first
		apiKey := c.GetHeader("X-API-Key")

		// If not found, try Authorization header with Bearer scheme
		if apiKey == "" {
			authHeader := c.GetHeader("Authorization")
			if authHeader == "" {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error":   "Missing API key",
					"message": "Authentication required. Provide API key via X-API-Key header or Authorization: Bearer <token>",
				})
				c.Abort()
				return
			}

			// Extract Bearer token
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error":   "Invalid API key format",
					"message": "Authorization header must use Bearer scheme: 'Bearer <api-key>'",
				})
				c.Abort()
				return
			}

			scheme := parts[0]
			if !strings.EqualFold(scheme, "Bearer") {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error":   "Invalid API key format",
					"message": "Only Bearer authentication scheme is supported",
				})
				c.Abort()
				return
			}

			apiKey = parts[1]
		}

		// Validate API key
		if !validKeysMap[apiKey] {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Invalid API key",
				"message": "The provided API key is not authorized to access this service",
			})
			c.Abort()
			return
		}

		// Extract source service name for logging/audit (optional)
		sourceService := c.GetHeader("X-Source-Service")
		if sourceService == "" {
			sourceService = "unknown"
		}
		c.Set("source_service", sourceService)

		// API key is valid, continue to next handler
		c.Next()
	}
}
