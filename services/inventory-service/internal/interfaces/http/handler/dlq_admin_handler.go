package handler

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/application/usecase"
)

// ListDLQMessagesExecutor interface for listing DLQ messages
type ListDLQMessagesExecutor interface {
	Execute(ctx context.Context, limit int, offset int) (*usecase.ListDLQMessagesOutput, error)
}

// GetDLQCountExecutor interface for getting DLQ count
type GetDLQCountExecutor interface {
	Execute(ctx context.Context) (int, error)
}

// RetryDLQMessageExecutor interface for retrying DLQ messages
type RetryDLQMessageExecutor interface {
	Execute(ctx context.Context, input usecase.RetryDLQMessageInput) (*usecase.RetryDLQMessageOutput, error)
}

// DLQAdminHandler handles Dead Letter Queue administrative endpoints
type DLQAdminHandler struct {
	listDLQUseCase ListDLQMessagesExecutor
	getDLQCountUC  GetDLQCountExecutor
	retryMessageUC RetryDLQMessageExecutor
}

// NewDLQAdminHandler creates a new DLQ admin handler
func NewDLQAdminHandler(
	listDLQUseCase ListDLQMessagesExecutor,
	getDLQCountUC GetDLQCountExecutor,
	retryMessageUC RetryDLQMessageExecutor,
) *DLQAdminHandler {
	if listDLQUseCase == nil {
		panic("listDLQUseCase cannot be nil")
	}
	if getDLQCountUC == nil {
		panic("getDLQCountUC cannot be nil")
	}
	if retryMessageUC == nil {
		panic("retryMessageUC cannot be nil")
	}

	return &DLQAdminHandler{
		listDLQUseCase: listDLQUseCase,
		getDLQCountUC:  getDLQCountUC,
		retryMessageUC: retryMessageUC,
	}
}

// DLQMessageResponse represents a DLQ message in API response
type DLQMessageResponse struct {
	ID            string `json:"id"`
	RoutingKey    string `json:"routing_key"`
	Body          string `json:"body"`
	ErrorReason   string `json:"error_reason"`
	FailedAt      string `json:"failed_at"`
	RetryCount    int    `json:"retry_count"`
	OriginalQueue string `json:"original_queue"`
}

// ListDLQMessagesResponse represents the response for listing DLQ messages
type ListDLQMessagesResponse struct {
	Messages   []DLQMessageResponse `json:"messages"`
	TotalCount int                  `json:"total_count"`
	Limit      int                  `json:"limit"`
	Offset     int                  `json:"offset"`
}

// GetDLQCountResponse represents the response for DLQ count
type GetDLQCountResponse struct {
	Count          int    `json:"count"`
	WarningLevel   int    `json:"warning_level"`
	HasWarning     bool   `json:"has_warning"`
	WarningMessage string `json:"warning_message,omitempty"`
}

// RetryMessageResponse represents the response for retrying a message
type RetryMessageResponse struct {
	MessageID string `json:"message_id"`
	Success   bool   `json:"success"`
	Message   string `json:"message"`
}

// ListDLQMessages handles GET /admin/dlq
func (h *DLQAdminHandler) ListDLQMessages(c *gin.Context) {
	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	output, err := h.listDLQUseCase.Execute(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_server_error",
			"message": "Failed to retrieve DLQ messages",
		})
		return
	}

	// Convert to response format
	messages := make([]DLQMessageResponse, len(output.Messages))
	for i, msg := range output.Messages {
		messages[i] = DLQMessageResponse{
			ID:            msg.ID,
			RoutingKey:    msg.RoutingKey,
			Body:          msg.Body,
			ErrorReason:   msg.ErrorReason,
			FailedAt:      msg.FailedAt.Format("2006-01-02T15:04:05Z07:00"),
			RetryCount:    msg.RetryCount,
			OriginalQueue: msg.OriginalQueue,
		}
	}

	c.JSON(http.StatusOK, ListDLQMessagesResponse{
		Messages:   messages,
		TotalCount: output.TotalCount,
		Limit:      limit,
		Offset:     offset,
	})
}

// GetDLQCount handles GET /admin/dlq/count
func (h *DLQAdminHandler) GetDLQCount(c *gin.Context) {
	count, err := h.getDLQCountUC.Execute(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_server_error",
			"message": "Failed to get DLQ count",
		})
		return
	}

	warningLevel := 10
	hasWarning := count > warningLevel
	warningMessage := ""
	if hasWarning {
		warningMessage = "DLQ has exceeded warning threshold"
	}

	c.JSON(http.StatusOK, GetDLQCountResponse{
		Count:          count,
		WarningLevel:   warningLevel,
		HasWarning:     hasWarning,
		WarningMessage: warningMessage,
	})
}

// RetryMessage handles POST /admin/dlq/:id/retry
func (h *DLQAdminHandler) RetryMessage(c *gin.Context) {
	messageID := c.Param("id")

	input := usecase.RetryDLQMessageInput{
		MessageID: messageID,
	}

	output, err := h.retryMessageUC.Execute(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_server_error",
			"message": "Failed to retry message",
		})
		return
	}

	statusCode := http.StatusOK
	if !output.Retried {
		statusCode = http.StatusBadRequest
	}

	c.JSON(statusCode, RetryMessageResponse{
		MessageID: output.MessageID,
		Success:   output.Retried,
		Message:   output.Message,
	})
}
