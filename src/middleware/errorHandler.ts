import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response';

interface PrismaError extends Error {
  code?: string;
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[Error]', err.message);

  if (err instanceof ZodError) {
    // ZodError.issues is the stable property (ZodError.errors is an alias added post-v3)
    const issues = (err.issues ?? (err as unknown as { errors: typeof err.issues }).errors) ?? [];
    const message = issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((e: any) => `${(e.path as (string | number)[]).join('.')}: ${e.message as string}`)
      .join('; ');
    sendError(res, message, 422);
    return;
  }

  const prismaErr = err as PrismaError;
  if (prismaErr.code === 'P2002') {
    sendError(res, 'A record with this value already exists', 409);
    return;
  }
  if (prismaErr.code === 'P2025') {
    sendError(res, 'Record not found', 404);
    return;
  }

  sendError(res, err.message || 'Internal server error', 500);
};

export const notFound = (_req: Request, res: Response): void => {
  sendError(res, 'Route not found', 404);
};
