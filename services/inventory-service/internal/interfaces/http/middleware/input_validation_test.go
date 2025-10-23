package middleware

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

type TestRequestWithUUID struct {
	ProductID string `json:"product_id" validate:"required,uuid4"`
}

type TestRequestWithQuantity struct {
	Quantity int `json:"quantity" validate:"required,min=1,max=1000"`
}

type TestRequestComplex struct {
	ProductID string `json:"product_id" validate:"required,uuid4"`
	Quantity  int    `json:"quantity" validate:"required,min=1,max=1000"`
	OrderID   string `json:"order_id" validate:"omitempty,uuid4"`
}

func TestInputValidationMiddleware_ValidateUUID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name               string
		productID          string
		expectedStatusCode int
		expectedBodyPart   string
	}{
		{
			name:               "Valid UUID v4",
			productID:          "550e8400-e29b-41d4-a716-446655440000",
			expectedStatusCode: http.StatusOK,
			expectedBodyPart:   "success",
		},
		{
			name:               "Invalid UUID format",
			productID:          "not-a-uuid",
			expectedStatusCode: http.StatusBadRequest,
			expectedBodyPart:   "ProductID",
		},
		{
			name:               "Empty UUID",
			productID:          "",
			expectedStatusCode: http.StatusBadRequest,
			expectedBodyPart:   "required",
		},
		{
			name:               "UUID v4 validation (strict)",
			productID:          "550e8400-e29b-41d4-a716-446655440001",
			expectedStatusCode: http.StatusOK,
			expectedBodyPart:   "success",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()

			router.POST("/test", InputValidationMiddleware[TestRequestWithUUID](), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			payload := TestRequestWithUUID{ProductID: tt.productID}
			body, _ := json.Marshal(payload)

			req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatusCode, w.Code)
			assert.Contains(t, w.Body.String(), tt.expectedBodyPart)
		})
	}
}

func TestInputValidationMiddleware_ValidateQuantity(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name               string
		quantity           int
		expectedStatusCode int
		expectedBodyPart   string
	}{
		{
			name:               "Valid quantity (middle range)",
			quantity:           500,
			expectedStatusCode: http.StatusOK,
			expectedBodyPart:   "success",
		},
		{
			name:               "Valid quantity (minimum)",
			quantity:           1,
			expectedStatusCode: http.StatusOK,
			expectedBodyPart:   "success",
		},
		{
			name:               "Valid quantity (maximum)",
			quantity:           1000,
			expectedStatusCode: http.StatusOK,
			expectedBodyPart:   "success",
		},
		{
			name:               "Invalid quantity (zero)",
			quantity:           0,
			expectedStatusCode: http.StatusBadRequest,
			expectedBodyPart:   "Quantity",
		},
		{
			name:               "Invalid quantity (negative)",
			quantity:           -5,
			expectedStatusCode: http.StatusBadRequest,
			expectedBodyPart:   "Quantity",
		},
		{
			name:               "Invalid quantity (exceeds maximum)",
			quantity:           1001,
			expectedStatusCode: http.StatusBadRequest,
			expectedBodyPart:   "Quantity",
		},
		{
			name:               "Invalid quantity (much too large)",
			quantity:           99999,
			expectedStatusCode: http.StatusBadRequest,
			expectedBodyPart:   "Quantity",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()

			router.POST("/test", InputValidationMiddleware[TestRequestWithQuantity](), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			payload := TestRequestWithQuantity{Quantity: tt.quantity}
			body, _ := json.Marshal(payload)

			req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatusCode, w.Code)
			assert.Contains(t, w.Body.String(), tt.expectedBodyPart)
		})
	}
}

func TestInputValidationMiddleware_ComplexValidation(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.POST("/test", InputValidationMiddleware[TestRequestComplex](), func(c *gin.Context) {
		// Access validated data from context
		validatedData, exists := c.Get("validated_data")
		assert.True(t, exists)

		data, ok := validatedData.(*TestRequestComplex)
		assert.True(t, ok)

		c.JSON(http.StatusOK, gin.H{
			"message": "success",
			"data":    data,
		})
	})

	tests := []struct {
		name               string
		payload            TestRequestComplex
		expectedStatusCode int
		expectedBodyPart   string
	}{
		{
			name: "All fields valid",
			payload: TestRequestComplex{
				ProductID: "550e8400-e29b-41d4-a716-446655440000",
				Quantity:  10,
				OrderID:   "660e8400-e29b-41d4-a716-446655440001",
			},
			expectedStatusCode: http.StatusOK,
			expectedBodyPart:   "success",
		},
		{
			name: "Optional OrderID missing (valid)",
			payload: TestRequestComplex{
				ProductID: "550e8400-e29b-41d4-a716-446655440000",
				Quantity:  10,
				OrderID:   "",
			},
			expectedStatusCode: http.StatusOK,
			expectedBodyPart:   "success",
		},
		{
			name: "Invalid ProductID",
			payload: TestRequestComplex{
				ProductID: "not-a-uuid",
				Quantity:  10,
				OrderID:   "660e8400-e29b-41d4-a716-446655440001",
			},
			expectedStatusCode: http.StatusBadRequest,
			expectedBodyPart:   "ProductID",
		},
		{
			name: "Invalid Quantity",
			payload: TestRequestComplex{
				ProductID: "550e8400-e29b-41d4-a716-446655440000",
				Quantity:  0,
				OrderID:   "660e8400-e29b-41d4-a716-446655440001",
			},
			expectedStatusCode: http.StatusBadRequest,
			expectedBodyPart:   "Quantity",
		},
		{
			name: "Invalid OrderID format",
			payload: TestRequestComplex{
				ProductID: "550e8400-e29b-41d4-a716-446655440000",
				Quantity:  10,
				OrderID:   "invalid-order-id",
			},
			expectedStatusCode: http.StatusBadRequest,
			expectedBodyPart:   "OrderID",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.payload)

			req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatusCode, w.Code)
			assert.Contains(t, w.Body.String(), tt.expectedBodyPart)
		})
	}
}

func TestInputValidationMiddleware_InvalidJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.POST("/test", InputValidationMiddleware[TestRequestWithUUID](), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	tests := []struct {
		name               string
		body               string
		expectedStatusCode int
		expectedBodyPart   string
	}{
		{
			name:               "Completely invalid JSON",
			body:               `{invalid json}`,
			expectedStatusCode: http.StatusBadRequest,
			expectedBodyPart:   "Invalid JSON",
		},
		{
			name:               "Empty body",
			body:               ``,
			expectedStatusCode: http.StatusBadRequest,
			expectedBodyPart:   "Invalid JSON",
		},
		{
			name:               "Malformed JSON (missing closing brace)",
			body:               `{"product_id": "550e8400-e29b-41d4-a716-446655440000"`,
			expectedStatusCode: http.StatusBadRequest,
			expectedBodyPart:   "Invalid JSON",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatusCode, w.Code)
			assert.Contains(t, w.Body.String(), tt.expectedBodyPart)
		})
	}
}

func TestInputValidationMiddleware_SQLInjectionPrevention(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.POST("/test", InputValidationMiddleware[TestRequestWithUUID](), func(c *gin.Context) {
		validatedData, _ := c.Get("validated_data")
		data := validatedData.(*TestRequestWithUUID)
		c.JSON(http.StatusOK, gin.H{
			"message":    "success",
			"product_id": data.ProductID,
		})
	})

	tests := []struct {
		name               string
		productID          string
		expectedStatusCode int
		description        string
	}{
		{
			name:               "SQL injection attempt (DROP TABLE)",
			productID:          "550e8400-e29b-41d4-a716-446655440000'; DROP TABLE inventory_items; --",
			expectedStatusCode: http.StatusBadRequest,
			description:        "Should reject SQL injection attempts",
		},
		{
			name:               "SQL injection attempt (OR 1=1)",
			productID:          "550e8400-e29b-41d4-a716-446655440000' OR '1'='1",
			expectedStatusCode: http.StatusBadRequest,
			description:        "Should reject OR-based SQL injection",
		},
		{
			name:               "Script tag injection",
			productID:          "<script>alert('xss')</script>",
			expectedStatusCode: http.StatusBadRequest,
			description:        "Should reject XSS attempts",
		},
		{
			name:               "Clean UUID",
			productID:          "550e8400-e29b-41d4-a716-446655440000",
			expectedStatusCode: http.StatusOK,
			description:        "Should accept clean UUID",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload := TestRequestWithUUID{ProductID: tt.productID}
			body, _ := json.Marshal(payload)

			req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatusCode, w.Code, tt.description)

			if tt.expectedStatusCode == http.StatusOK {
				// Verify the UUID was not modified
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Equal(t, tt.productID, response["product_id"])
			}
		})
	}
}

func TestInputValidationMiddleware_ContextData(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.POST("/test", InputValidationMiddleware[TestRequestWithQuantity](), func(c *gin.Context) {
		// Check that validated data is available in context
		validatedData, exists := c.Get("validated_data")
		assert.True(t, exists, "validated_data should exist in context")

		data, ok := validatedData.(*TestRequestWithQuantity)
		assert.True(t, ok, "validated_data should be of correct type")
		assert.Equal(t, 100, data.Quantity)

		c.JSON(http.StatusOK, gin.H{
			"message":  "success",
			"quantity": data.Quantity,
		})
	})

	payload := TestRequestWithQuantity{Quantity: 100}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, float64(100), response["quantity"])
}
