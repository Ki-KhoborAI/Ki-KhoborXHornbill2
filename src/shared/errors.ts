import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Standard API error response shape:
 * { "error": { "code": string, "message": string } }
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Base operational application error.
 * Throw this inside handlers/services when an expected business or validation error occurs.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Global Fastify error handler ensuring every API error responds
 * in the uniform shape: { "error": { "code": string, "message": string } }
 */
export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log the error for debugging
  request.log.error(error);

  // Handle custom AppError
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  // Handle Fastify built-in errors (validation errors, 404, etc.)
  const fastifyError = error as FastifyError;
  const statusCode = fastifyError.statusCode ?? 500;
  const code = fastifyError.code ?? (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');
  const message = fastifyError.message || 'An unexpected error occurred';

  return reply.status(statusCode).send({
    error: {
      code,
      message,
    },
  });
}

/**
 * 404 Not Found handler to ensure missing routes also return the uniform error shape.
 */
export function notFoundHandler(request: FastifyRequest, reply: FastifyReply) {
  return reply.status(404).send({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method}:${request.url} not found`,
    },
  });
}

