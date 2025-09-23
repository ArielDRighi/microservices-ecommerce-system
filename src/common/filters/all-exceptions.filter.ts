import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

export interface HttpExceptionResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  method: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: HttpStatus;
    let errorMessage: string | string[];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      errorMessage = (errorResponse as any)?.message || exception.message;
    } else if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      errorMessage = this.handleDatabaseError(exception);
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorMessage = exception.message;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorMessage = 'Internal server error';
    }

    const errorResponse: HttpExceptionResponse = {
      statusCode: status,
      message: errorMessage,
      error: HttpStatus[status],
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    this.logger.error(`${request.method} ${request.url}`, JSON.stringify(errorResponse));

    response.status(status).json(errorResponse);
  }

  private handleDatabaseError(error: QueryFailedError): string {
    const message = error.message;

    // Handle unique constraint violations
    if (message.includes('duplicate key value')) {
      return 'Resource already exists';
    }

    // Handle foreign key violations
    if (message.includes('violates foreign key constraint')) {
      return 'Referenced resource does not exist';
    }

    // Handle not null violations
    if (message.includes('violates not-null constraint')) {
      return 'Required field is missing';
    }

    // Handle check constraint violations
    if (message.includes('violates check constraint')) {
      return 'Invalid data provided';
    }

    return 'Database error occurred';
  }
}
