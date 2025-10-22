package main

import (
	"bytes"
	"log"
	"os"
	"strings"
	"testing"
)

// TestGetEnvAsInt_ValidValue tests parsing a valid integer from environment variable
func TestGetEnvAsInt_ValidValue(t *testing.T) {
	// Arrange
	key := "TEST_INT_VAR"
	expectedValue := 42
	os.Setenv(key, "42")
	defer os.Unsetenv(key)

	// Act
	result := getEnvAsInt(key, 10)

	// Assert
	if result != expectedValue {
		t.Errorf("Expected %d, got %d", expectedValue, result)
	}
}

// TestGetEnvAsInt_InvalidValue tests handling of non-integer value with warning log
func TestGetEnvAsInt_InvalidValue(t *testing.T) {
	// Arrange
	key := "TEST_INVALID_INT_VAR"
	defaultValue := 10
	invalidValue := "not-a-number"
	os.Setenv(key, invalidValue)
	defer os.Unsetenv(key)

	// Capture log output
	var buf bytes.Buffer
	log.SetOutput(&buf)
	defer log.SetOutput(os.Stderr)

	// Act
	result := getEnvAsInt(key, defaultValue)

	// Assert
	if result != defaultValue {
		t.Errorf("Expected default value %d, got %d", defaultValue, result)
	}

	// Verify warning log was generated
	logOutput := buf.String()
	if !strings.Contains(logOutput, "Warning: Invalid value") {
		t.Errorf("Expected warning log, got: %s", logOutput)
	}
	if !strings.Contains(logOutput, key) {
		t.Errorf("Expected log to contain key '%s', got: %s", key, logOutput)
	}
	if !strings.Contains(logOutput, invalidValue) {
		t.Errorf("Expected log to contain invalid value '%s', got: %s", invalidValue, logOutput)
	}
	if !strings.Contains(logOutput, "using default: 10") {
		t.Errorf("Expected log to contain default value, got: %s", logOutput)
	}
}

// TestGetEnvAsInt_EmptyValue tests behavior when environment variable is not set
func TestGetEnvAsInt_EmptyValue(t *testing.T) {
	// Arrange
	key := "TEST_EMPTY_INT_VAR"
	defaultValue := 20
	os.Unsetenv(key) // Ensure it's not set

	// Capture log output (should not log anything)
	var buf bytes.Buffer
	log.SetOutput(&buf)
	defer log.SetOutput(os.Stderr)

	// Act
	result := getEnvAsInt(key, defaultValue)

	// Assert
	if result != defaultValue {
		t.Errorf("Expected default value %d, got %d", defaultValue, result)
	}

	// Verify no warning was logged (empty var is expected behavior)
	logOutput := buf.String()
	if strings.Contains(logOutput, "Warning") {
		t.Errorf("Unexpected warning log for empty variable: %s", logOutput)
	}
}

// TestGetEnvAsInt_ZeroValue tests parsing "0" as valid integer
func TestGetEnvAsInt_ZeroValue(t *testing.T) {
	// Arrange
	key := "TEST_ZERO_INT_VAR"
	os.Setenv(key, "0")
	defer os.Unsetenv(key)

	// Act
	result := getEnvAsInt(key, 99)

	// Assert
	if result != 0 {
		t.Errorf("Expected 0, got %d", result)
	}
}

// TestGetEnvAsInt_NegativeValue tests parsing negative integers
func TestGetEnvAsInt_NegativeValue(t *testing.T) {
	// Arrange
	key := "TEST_NEGATIVE_INT_VAR"
	expectedValue := -5
	os.Setenv(key, "-5")
	defer os.Unsetenv(key)

	// Act
	result := getEnvAsInt(key, 10)

	// Assert
	if result != expectedValue {
		t.Errorf("Expected %d, got %d", expectedValue, result)
	}
}

// TestGetEnvAsInt_EdgeCases tests various invalid formats
func TestGetEnvAsInt_EdgeCases(t *testing.T) {
	testCases := []struct {
		name         string
		value        string
		defaultValue int
		shouldWarn   bool
	}{
		{"Float value", "3.14", 10, true},
		{"Scientific notation", "1e5", 10, true},
		{"Hexadecimal", "0xFF", 10, true},
		{"Text with number", "5 minutes", 10, true},
		{"Leading spaces", "  42", 10, true},
		{"Trailing spaces", "42  ", 10, true},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Arrange
			key := "TEST_EDGE_CASE_VAR"
			os.Setenv(key, tc.value)
			defer os.Unsetenv(key)

			var buf bytes.Buffer
			log.SetOutput(&buf)
			defer log.SetOutput(os.Stderr)

			// Act
			result := getEnvAsInt(key, tc.defaultValue)

			// Assert
			if result != tc.defaultValue {
				t.Errorf("Expected default %d, got %d", tc.defaultValue, result)
			}
			if tc.shouldWarn && !strings.Contains(buf.String(), "Warning") {
				t.Errorf("Expected warning for value '%s'", tc.value)
			}
		})
	}
}
