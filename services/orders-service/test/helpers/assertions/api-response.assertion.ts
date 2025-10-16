import * as request from 'supertest';

/**
 * Helper para assertions comunes en respuestas de API
 */
export class ApiResponseAssertion {
  /**
   * Valida que la respuesta sea exitosa (2xx)
   */
  static expectSuccess(response: request.Response): void {
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
  }

  /**
   * Valida que la respuesta sea 200 OK
   */
  static expectOk(response: request.Response): void {
    expect(response.status).toBe(200);
  }

  /**
   * Valida que la respuesta sea 201 Created
   */
  static expectCreated(response: request.Response): void {
    expect(response.status).toBe(201);
  }

  /**
   * Valida que la respuesta sea 204 No Content
   */
  static expectNoContent(response: request.Response): void {
    expect(response.status).toBe(204);
  }

  /**
   * Valida que la respuesta sea 400 Bad Request
   */
  static expectBadRequest(response: request.Response, message?: string): void {
    expect(response.status).toBe(400);
    if (message) {
      expect(response.body.message).toContain(message);
    }
  }

  /**
   * Valida que la respuesta sea 401 Unauthorized
   */
  static expectUnauthorized(response: request.Response): void {
    expect(response.status).toBe(401);
  }

  /**
   * Valida que la respuesta sea 403 Forbidden
   */
  static expectForbidden(response: request.Response): void {
    expect(response.status).toBe(403);
  }

  /**
   * Valida que la respuesta sea 404 Not Found
   */
  static expectNotFound(response: request.Response, message?: string): void {
    expect(response.status).toBe(404);
    if (message) {
      expect(response.body.message).toContain(message);
    }
  }

  /**
   * Valida que la respuesta sea 409 Conflict
   */
  static expectConflict(response: request.Response, message?: string): void {
    expect(response.status).toBe(409);
    if (message) {
      expect(response.body.message).toContain(message);
    }
  }

  /**
   * Valida que la respuesta sea 422 Unprocessable Entity
   */
  static expectUnprocessableEntity(response: request.Response): void {
    expect(response.status).toBe(422);
  }

  /**
   * Valida que la respuesta sea 500 Internal Server Error
   */
  static expectInternalServerError(response: request.Response): void {
    expect(response.status).toBe(500);
  }

  /**
   * Valida que la respuesta contenga errores de validación
   */
  static expectValidationErrors(response: request.Response, fields?: string[]): void {
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('errors');

    if (fields) {
      fields.forEach((field) => {
        expect(response.body.errors).toHaveProperty(field);
      });
    }
  }

  /**
   * Valida la estructura de paginación en la respuesta
   */
  static expectPaginatedResponse(
    response: request.Response,
    expectedKeys: string[] = ['items', 'meta'],
  ): void {
    this.expectSuccess(response);
    expectedKeys.forEach((key) => {
      expect(response.body).toHaveProperty(key);
    });

    if (response.body.meta) {
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('totalPages');
    }
  }

  /**
   * Valida que la respuesta contenga un objeto con propiedades específicas
   */
  static expectObjectWithProperties(response: request.Response, properties: string[]): void {
    this.expectSuccess(response);
    properties.forEach((prop) => {
      expect(response.body).toHaveProperty(prop);
    });
  }

  /**
   * Valida que la respuesta contenga un array
   */
  static expectArray(response: request.Response): void {
    this.expectSuccess(response);
    expect(Array.isArray(response.body)).toBe(true);
  }

  /**
   * Valida que la respuesta contenga un array con una longitud específica
   */
  static expectArrayWithLength(response: request.Response, length: number): void {
    this.expectArray(response);
    expect(response.body).toHaveLength(length);
  }

  /**
   * Valida que la respuesta contenga un array con al menos N elementos
   */
  static expectArrayWithMinLength(response: request.Response, minLength: number): void {
    this.expectArray(response);
    expect(response.body.length).toBeGreaterThanOrEqual(minLength);
  }

  /**
   * Valida que la respuesta contenga un header específico
   */
  static expectHeader(response: request.Response, headerName: string, value?: string): void {
    expect(response.headers).toHaveProperty(headerName.toLowerCase());
    if (value) {
      expect(response.headers[headerName.toLowerCase()]).toBe(value);
    }
  }

  /**
   * Valida que la respuesta contenga un token de autenticación
   */
  static expectAuthToken(response: request.Response): string {
    this.expectSuccess(response);
    expect(response.body).toHaveProperty('accessToken');
    expect(typeof response.body.accessToken).toBe('string');
    expect(response.body.accessToken.length).toBeGreaterThan(0);
    return response.body.accessToken;
  }

  /**
   * Valida que la respuesta contenga información de usuario autenticado
   */
  static expectAuthenticatedUser(
    response: request.Response,
    expectedProperties: string[] = ['id', 'email'],
  ): void {
    this.expectSuccess(response);
    expect(response.body).toHaveProperty('user');
    expectedProperties.forEach((prop) => {
      expect(response.body.user).toHaveProperty(prop);
    });
  }

  /**
   * Valida que la respuesta sea una redirección (3xx)
   */
  static expectRedirect(response: request.Response, location?: string): void {
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    if (location) {
      expect(response.headers['location']).toBe(location);
    }
  }

  /**
   * Valida que la respuesta contenga un timestamp válido
   */
  static expectValidTimestamp(response: request.Response, field: string = 'createdAt'): void {
    expect(response.body).toHaveProperty(field);
    const timestamp = new Date(response.body[field]);
    expect(timestamp.toString()).not.toBe('Invalid Date');
  }

  /**
   * Valida que la respuesta contenga un UUID válido
   */
  static expectValidUuid(response: request.Response, field: string = 'id'): void {
    expect(response.body).toHaveProperty(field);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(response.body[field]).toMatch(uuidRegex);
  }

  /**
   * Valida que la respuesta contenga un mensaje de error específico
   */
  static expectErrorMessage(response: request.Response, message: string): void {
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain(message);
  }

  /**
   * Valida el formato de respuesta de error estándar
   */
  static expectStandardErrorFormat(response: request.Response): void {
    expect(response.body).toHaveProperty('statusCode');
    expect(response.body).toHaveProperty('message');
    expect(response.body.statusCode).toBe(response.status);
  }
}
