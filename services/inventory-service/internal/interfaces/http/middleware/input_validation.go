package middleware

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// InputValidationMiddleware creates a generic middleware for input validation using go-playground/validator.
// It validates the request body against the struct tags and returns 400 Bad Request if validation fails.
//
// Type parameter T should be a struct with validator tags.
//
// Example usage:
//
//	type CreateOrderRequest struct {
//	    ProductID string `json:"product_id" validate:"required,uuid4"`
//	    Quantity  int    `json:"quantity" validate:"required,min=1,max=1000"`
//	}
//
//	router.POST("/orders", InputValidationMiddleware[CreateOrderRequest](), handleCreateOrder)
//
// The validated data is available in the Gin context under the key "validated_data":
//
//	func handleCreateOrder(c *gin.Context) {
//	    data, _ := c.Get("validated_data")
//	    req := data.(*CreateOrderRequest)
//	    // ... use validated req
//	}
func InputValidationMiddleware[T any]() gin.HandlerFunc {
	validate := validator.New()

	return func(c *gin.Context) {
		var request T

		// Bind JSON to struct
		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid JSON format",
				"message": "Request body must be valid JSON",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Validate struct
		if err := validate.Struct(request); err != nil {
			validationErrors := err.(validator.ValidationErrors)

			// Format validation errors
			errorMessages := make(map[string]string)
			for _, fieldError := range validationErrors {
				fieldName := fieldError.Field()
				errorMessages[fieldName] = formatValidationError(fieldError)
			}

			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Validation failed",
				"message": "One or more fields failed validation",
				"fields":  errorMessages,
			})
			c.Abort()
			return
		}

		// Store validated data in context for handler use
		c.Set("validated_data", &request)
		c.Next()
	}
}

// formatValidationError converts a validator.FieldError into a human-readable message
func formatValidationError(err validator.FieldError) string {
	field := err.Field()
	tag := err.Tag()
	param := err.Param()

	switch tag {
	case "required":
		return fmt.Sprintf("%s is required", field)
	case "min":
		if err.Type().String() == "int" {
			return fmt.Sprintf("%s must be at least %s", field, param)
		}
		return fmt.Sprintf("%s must have a minimum length of %s", field, param)
	case "max":
		if err.Type().String() == "int" {
			return fmt.Sprintf("%s must be at most %s", field, param)
		}
		return fmt.Sprintf("%s must have a maximum length of %s", field, param)
	case "uuid4":
		return fmt.Sprintf("%s must be a valid UUID v4", field)
	case "uuid":
		return fmt.Sprintf("%s must be a valid UUID", field)
	case "email":
		return fmt.Sprintf("%s must be a valid email address", field)
	case "url":
		return fmt.Sprintf("%s must be a valid URL", field)
	case "oneof":
		return fmt.Sprintf("%s must be one of [%s]", field, param)
	case "gt":
		return fmt.Sprintf("%s must be greater than %s", field, param)
	case "gte":
		return fmt.Sprintf("%s must be greater than or equal to %s", field, param)
	case "lt":
		return fmt.Sprintf("%s must be less than %s", field, param)
	case "lte":
		return fmt.Sprintf("%s must be less than or equal to %s", field, param)
	case "len":
		return fmt.Sprintf("%s must have a length of %s", field, param)
	case "alpha":
		return fmt.Sprintf("%s must contain only alphabetic characters", field)
	case "alphanum":
		return fmt.Sprintf("%s must contain only alphanumeric characters", field)
	case "numeric":
		return fmt.Sprintf("%s must be numeric", field)
	default:
		return fmt.Sprintf("%s failed validation (%s)", field, tag)
	}
}
