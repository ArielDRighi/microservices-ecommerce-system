package middleware

import (
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// MethodBasedRateLimiter implements rate limiting with different limits per HTTP method
type MethodBasedRateLimiter struct {
	redis         RedisClient
	getLim        int64 // Limit for GET requests
	postLimit     int64 // Limit for POST/PUT/PATCH/DELETE requests
	window        time.Duration
	keyPrefix     string
	enableLogging bool
}

// MethodBasedRateLimiterConfig holds configuration for method-based rate limiting
type MethodBasedRateLimiterConfig struct {
	Redis         RedisClient
	GetLimit      int64         // e.g., 200 req/min for read operations
	WriteLimit    int64         // e.g., 100 req/min for write operations
	Window        time.Duration // e.g., 1 minute
	EnableLogging bool
}

// NewMethodBasedRateLimiter creates a new MethodBasedRateLimiter instance with different limits per method
func NewMethodBasedRateLimiter(config MethodBasedRateLimiterConfig) *MethodBasedRateLimiter {
	return &MethodBasedRateLimiter{
		redis:         config.Redis,
		getLim:        config.GetLimit,
		postLimit:     config.WriteLimit,
		window:        config.Window,
		keyPrefix:     "rate_limit:method:",
		enableLogging: config.EnableLogging,
	}
}

// Middleware returns a Gin middleware function for method-based rate limiting
func (rl *MethodBasedRateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract client IP and method
		clientIP := rl.getClientIP(c)
		method := c.Request.Method

		// Determine limit based on HTTP method
		var limit int64
		if method == http.MethodGet || method == http.MethodHead {
			limit = rl.getLim
		} else {
			// POST, PUT, PATCH, DELETE
			limit = rl.postLimit
		}

		// Create unique key with method suffix
		key := fmt.Sprintf("%s%s:%s", rl.keyPrefix, clientIP, strings.ToLower(method))

		// Increment request count
		count, err := rl.redis.Increment(key, rl.window)
		if err != nil {
			// Fail-open: if Redis is unavailable, allow the request
			if rl.enableLogging {
				// Log error in production
				fmt.Printf("Rate limiter Redis error: %v\n", err)
			}
			c.Next()
			return
		}

		// Calculate remaining requests
		remaining := limit - count
		if remaining < 0 {
			remaining = 0
		}

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
		c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(rl.window).Unix()))
		c.Header("X-RateLimit-Method", method)

		// Check if limit exceeded
		if count > limit {
			c.Header("Retry-After", fmt.Sprintf("%d", int(rl.window.Seconds())))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "rate_limit_exceeded",
				"message": fmt.Sprintf("Rate limit of %d %s requests per %s exceeded", limit, method, rl.window),
				"limit":   limit,
				"method":  method,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// getClientIP extracts the real client IP address
func (rl *MethodBasedRateLimiter) getClientIP(c *gin.Context) string {
	// Check X-Forwarded-For header (standard for proxies)
	forwarded := c.GetHeader("X-Forwarded-For")
	if forwarded != "" {
		// Get the first IP in the list (original client)
		ips := strings.Split(forwarded, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Check X-Real-IP header (alternative)
	realIP := c.GetHeader("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	// Fall back to RemoteAddr
	ip, _, err := net.SplitHostPort(c.Request.RemoteAddr)
	if err != nil {
		return c.Request.RemoteAddr
	}

	return ip
}
