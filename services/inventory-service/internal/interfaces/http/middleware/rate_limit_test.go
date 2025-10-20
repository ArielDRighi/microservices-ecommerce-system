package middleware_test

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/interfaces/http/middleware"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRedisClient is a mock of RedisClient for testing
type MockRedisClient struct {
	mock.Mock
}

func (m *MockRedisClient) Increment(key string, ttl time.Duration) (int64, error) {
	args := m.Called(key, ttl)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockRedisClient) Get(key string) (string, error) {
	args := m.Called(key)
	return args.String(0), args.Error(1)
}

func (m *MockRedisClient) Set(key string, value string, ttl time.Duration) error {
	args := m.Called(key, value, ttl)
	return args.Error(0)
}

func (m *MockRedisClient) Delete(key string) error {
	args := m.Called(key)
	return args.Error(0)
}

func (m *MockRedisClient) Close() error {
	args := m.Called()
	return args.Error(0)
}

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func TestRateLimitMiddleware_AllowsRequestsUnderLimit(t *testing.T) {
	// Arrange
	router := setupTestRouter()
	mockRedis := new(MockRedisClient)

	// First request - count is 1
	mockRedis.On("Increment", "rate_limit:127.0.0.1", time.Minute).Return(int64(1), nil).Once()

	rateLimiter := middleware.NewRateLimiter(mockRedis, 100, time.Minute)
	router.Use(rateLimiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Act
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.RemoteAddr = "127.0.0.1:12345"
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Header().Get("X-RateLimit-Limit"), "100")
	assert.Contains(t, w.Header().Get("X-RateLimit-Remaining"), "99")
	mockRedis.AssertExpectations(t)
}

func TestRateLimitMiddleware_BlocksRequestsOverLimit(t *testing.T) {
	// Arrange
	router := setupTestRouter()
	mockRedis := new(MockRedisClient)

	// Request exceeds limit - count is 101
	mockRedis.On("Increment", "rate_limit:127.0.0.1", time.Minute).Return(int64(101), nil)

	rateLimiter := middleware.NewRateLimiter(mockRedis, 100, time.Minute)
	router.Use(rateLimiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Act
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.RemoteAddr = "127.0.0.1:12345"
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusTooManyRequests, w.Code)
	assert.Equal(t, "100", w.Header().Get("X-RateLimit-Limit"))
	assert.Equal(t, "0", w.Header().Get("X-RateLimit-Remaining"))
	assert.NotEmpty(t, w.Header().Get("Retry-After"))
	mockRedis.AssertExpectations(t)
}

func TestRateLimitMiddleware_HandlesDifferentIPs(t *testing.T) {
	// Arrange
	router := setupTestRouter()
	mockRedis := new(MockRedisClient)

	// IP 1 - count is 50
	mockRedis.On("Increment", "rate_limit:192.168.1.1", time.Minute).Return(int64(50), nil).Once()
	// IP 2 - count is 1
	mockRedis.On("Increment", "rate_limit:192.168.1.2", time.Minute).Return(int64(1), nil).Once()

	rateLimiter := middleware.NewRateLimiter(mockRedis, 100, time.Minute)
	router.Use(rateLimiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Act - Request from IP 1
	req1 := httptest.NewRequest(http.MethodGet, "/test", nil)
	req1.RemoteAddr = "192.168.1.1:12345"
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)

	// Act - Request from IP 2
	req2 := httptest.NewRequest(http.MethodGet, "/test", nil)
	req2.RemoteAddr = "192.168.1.2:54321"
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	// Assert - Both succeed but with different remaining counts
	assert.Equal(t, http.StatusOK, w1.Code)
	assert.Equal(t, "50", w1.Header().Get("X-RateLimit-Remaining"))

	assert.Equal(t, http.StatusOK, w2.Code)
	assert.Equal(t, "99", w2.Header().Get("X-RateLimit-Remaining"))

	mockRedis.AssertExpectations(t)
}

func TestRateLimitMiddleware_HandlesRedisError(t *testing.T) {
	// Arrange
	router := setupTestRouter()
	mockRedis := new(MockRedisClient)

	// Redis fails
	mockRedis.On("Increment", "rate_limit:127.0.0.1", time.Minute).Return(int64(0), fmt.Errorf("redis connection error"))

	rateLimiter := middleware.NewRateLimiter(mockRedis, 100, time.Minute)
	router.Use(rateLimiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Act
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.RemoteAddr = "127.0.0.1:12345"
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert - Request should pass through (fail-open strategy)
	assert.Equal(t, http.StatusOK, w.Code)
	mockRedis.AssertExpectations(t)
}

func TestRateLimitMiddleware_ExtractsIPFromXForwardedFor(t *testing.T) {
	// Arrange
	router := setupTestRouter()
	mockRedis := new(MockRedisClient)

	// Expect the first IP from X-Forwarded-For
	mockRedis.On("Increment", "rate_limit:203.0.113.1", time.Minute).Return(int64(1), nil)

	rateLimiter := middleware.NewRateLimiter(mockRedis, 100, time.Minute)
	router.Use(rateLimiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Act
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("X-Forwarded-For", "203.0.113.1, 198.51.100.1")
	req.RemoteAddr = "127.0.0.1:12345"
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)
	mockRedis.AssertExpectations(t)
}
