import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '../types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string,
  pagination?: PaginationMeta
): void => {
  const response: ApiResponse<T> = { success: true, data, message, pagination };
  res.status(statusCode).json(response);
};

export const sendError = (res: Response, error: string, statusCode = 400): void => {
  const response: ApiResponse = { success: false, error };
  res.status(statusCode).json(response);
};
