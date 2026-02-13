import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { CarrierError } from './carrier-errors';

@Catch()
export class CarrierExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    // Let NestJS built-in exceptions (ValidationPipe, NotFoundException, etc.)
    // pass through with their original status and body untouched
    if (exception instanceof HttpException) {
      return res.status(exception.getStatus()).json(exception.getResponse());
    }

    if (exception instanceof CarrierError) {
      return res.status(exception.httpStatus).json({
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
        },
      });
    }

    // fallback (don't leak internals)
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected error',
      },
    });
  }
}
