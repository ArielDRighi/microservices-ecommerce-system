import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { InventoryServiceClient } from './inventory-client.service';
import {
  CheckStockRequest,
  CheckStockResponse,
  ReserveStockRequest,
  ReserveStockResponse,
  ConfirmReservationRequest,
  ConfirmReservationResponse,
  ReleaseReservationRequest,
  ReleaseReservationResponse,
} from './interfaces/inventory-client.interface';
import {
  InventoryServiceUnavailableException,
  InventoryServiceTimeoutException,
  InsufficientStockException,
  ReservationNotFoundException,
} from './exceptions/inventory-client.exceptions';

describe('InventoryServiceClient', () => {
  let service: InventoryServiceClient;

  const mockHttpService = {
    request: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: any) => defaultValue),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryServiceClient,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<InventoryServiceClient>(InventoryServiceClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkStock', () => {
    it('should check stock successfully', async () => {
      const request: CheckStockRequest = {
        productId: 'prod-123',
        quantity: 10,
      };

      const mockResponse: CheckStockResponse = {
        available: true,
        productId: 'prod-123',
        requestedQuantity: 10,
        availableQuantity: 50,
      };

      const axiosResponse: AxiosResponse<CheckStockResponse> = {
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.request.mockReturnValue(of(axiosResponse));

      const result = await service.checkStock(request);

      expect(result).toEqual(mockResponse);
      expect(mockHttpService.request).toHaveBeenCalled();
    });

    it('should throw InventoryServiceTimeoutException on timeout', async () => {
      const request: CheckStockRequest = {
        productId: 'prod-123',
        quantity: 10,
      };

      const timeoutError: Partial<AxiosError> = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
        name: 'TimeoutError',
        config: {} as any,
        isAxiosError: true,
        toJSON: () => ({}),
      };

      mockHttpService.request.mockReturnValue(throwError(() => timeoutError));

      await expect(service.checkStock(request)).rejects.toThrow(InventoryServiceTimeoutException);
    });

    it('should throw InventoryServiceUnavailableException on connection refused', async () => {
      const request: CheckStockRequest = {
        productId: 'prod-123',
        quantity: 10,
      };

      const connectionError: Partial<AxiosError> = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:8080',
        name: 'Error',
        config: {} as any,
        isAxiosError: true,
        toJSON: () => ({}),
      };

      mockHttpService.request.mockReturnValue(throwError(() => connectionError));

      await expect(service.checkStock(request)).rejects.toThrow(
        InventoryServiceUnavailableException,
      );
    });
  });

  describe('reserveStock', () => {
    it('should reserve stock successfully', async () => {
      const request: ReserveStockRequest = {
        productId: 'prod-123',
        quantity: 10,
        orderId: 'order-456',
        expiresAt: new Date('2025-12-31'),
      };

      const mockResponse: ReserveStockResponse = {
        reservationId: 'res-789',
        productId: 'prod-123',
        quantity: 10,
        orderId: 'order-456',
        expiresAt: new Date('2025-12-31'),
        createdAt: new Date('2025-01-01'),
      };

      const axiosResponse: AxiosResponse<ReserveStockResponse> = {
        data: mockResponse,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      };

      mockHttpService.request.mockReturnValue(of(axiosResponse));

      const result = await service.reserveStock(request);

      expect(result).toEqual(mockResponse);
      expect(mockHttpService.request).toHaveBeenCalled();
    });

    it('should throw InsufficientStockException on 409 Conflict', async () => {
      const request: ReserveStockRequest = {
        productId: 'prod-123',
        quantity: 100,
        orderId: 'order-456',
      };

      const conflictError: Partial<AxiosError> = {
        code: 'ERR_BAD_REQUEST',
        message: 'Request failed with status code 409',
        name: 'AxiosError',
        config: {} as any,
        isAxiosError: true,
        response: {
          data: { availableQuantity: 50 },
          status: 409,
          statusText: 'Conflict',
          headers: {},
          config: {} as any,
        },
        toJSON: () => ({}),
      };

      mockHttpService.request.mockReturnValue(throwError(() => conflictError));

      await expect(service.reserveStock(request)).rejects.toThrow(InsufficientStockException);
    });
  });

  describe('confirmReservation', () => {
    it('should confirm reservation successfully', async () => {
      const request: ConfirmReservationRequest = {
        reservationId: 'res-789',
      };

      const mockResponse: ConfirmReservationResponse = {
        confirmed: true,
        reservationId: 'res-789',
      };

      const axiosResponse: AxiosResponse<ConfirmReservationResponse> = {
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.request.mockReturnValue(of(axiosResponse));

      const result = await service.confirmReservation(request);

      expect(result).toEqual(mockResponse);
      expect(mockHttpService.request).toHaveBeenCalled();
    });

    it('should throw ReservationNotFoundException on 404 Not Found', async () => {
      const request: ConfirmReservationRequest = {
        reservationId: 'res-not-found',
      };

      const notFoundError: Partial<AxiosError> = {
        code: 'ERR_BAD_REQUEST',
        message: 'Request failed with status code 404',
        name: 'AxiosError',
        config: {} as any,
        isAxiosError: true,
        response: {
          data: {},
          status: 404,
          statusText: 'Not Found',
          headers: {},
          config: {} as any,
        },
        toJSON: () => ({}),
      };

      mockHttpService.request.mockReturnValue(throwError(() => notFoundError));

      await expect(service.confirmReservation(request)).rejects.toThrow(
        ReservationNotFoundException,
      );
    });
  });

  describe('releaseReservation', () => {
    it('should release reservation successfully', async () => {
      const request: ReleaseReservationRequest = {
        reservationId: 'res-789',
        reason: 'Order cancelled',
      };

      const mockResponse: ReleaseReservationResponse = {
        released: true,
        reservationId: 'res-789',
      };

      const axiosResponse: AxiosResponse<ReleaseReservationResponse> = {
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.request.mockReturnValue(of(axiosResponse));

      const result = await service.releaseReservation(request);

      expect(result).toEqual(mockResponse);
      expect(mockHttpService.request).toHaveBeenCalled();
    });

    it('should throw ReservationNotFoundException on 404 Not Found', async () => {
      const request: ReleaseReservationRequest = {
        reservationId: 'res-not-found',
      };

      const notFoundError: Partial<AxiosError> = {
        code: 'ERR_BAD_REQUEST',
        message: 'Request failed with status code 404',
        name: 'AxiosError',
        config: {} as any,
        isAxiosError: true,
        response: {
          data: {},
          status: 404,
          statusText: 'Not Found',
          headers: {},
          config: {} as any,
        },
        toJSON: () => ({}),
      };

      mockHttpService.request.mockReturnValue(throwError(() => notFoundError));

      await expect(service.releaseReservation(request)).rejects.toThrow(
        ReservationNotFoundException,
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true when service is UP', async () => {
      const mockResponse = { status: 'ok' };

      const axiosResponse: AxiosResponse<{ status: string }> = {
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.request.mockReturnValue(of(axiosResponse));

      const result = await service.healthCheck();

      expect(result).toBe(true);
      expect(mockHttpService.request).toHaveBeenCalled();
    });

    it('should return false when service is DOWN', async () => {
      const connectionError: Partial<AxiosError> = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:8080',
        name: 'Error',
        config: {} as any,
        isAxiosError: true,
        toJSON: () => ({}),
      };

      mockHttpService.request.mockReturnValue(throwError(() => connectionError));

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw InventoryServiceUnavailableException on 5xx errors', async () => {
      const request: CheckStockRequest = {
        productId: 'prod-123',
        quantity: 10,
      };

      const serverError: Partial<AxiosError> = {
        code: 'ERR_BAD_RESPONSE',
        message: 'Request failed with status code 503',
        name: 'AxiosError',
        config: {} as any,
        isAxiosError: true,
        response: {
          data: {},
          status: 503,
          statusText: 'Service Unavailable',
          headers: {},
          config: {} as any,
        },
        toJSON: () => ({}),
      };

      mockHttpService.request.mockReturnValue(throwError(() => serverError));

      await expect(service.checkStock(request)).rejects.toThrow(
        InventoryServiceUnavailableException,
      );
    });

    it('should throw InventoryServiceUnavailableException on network errors', async () => {
      const request: CheckStockRequest = {
        productId: 'prod-123',
        quantity: 10,
      };

      const networkError: Partial<AxiosError> = {
        code: 'ENETUNREACH',
        message: 'Network is unreachable',
        name: 'Error',
        config: {} as any,
        isAxiosError: true,
        toJSON: () => ({}),
      };

      mockHttpService.request.mockReturnValue(throwError(() => networkError));

      await expect(service.checkStock(request)).rejects.toThrow(
        InventoryServiceUnavailableException,
      );
    });
  });
});
