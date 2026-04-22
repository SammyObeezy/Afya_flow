import { Request } from 'express';

export type Role = 'admin' | 'health_worker';
export type Gender = 'male' | 'female' | 'other';
export type ConditionType = 'HIV' | 'TB' | 'Hypertension' | 'Malaria' | 'Typhoid' | 'Diabetes' | 'Other';
export type NotificationType = 'missed_medication' | 'upcoming_visit' | 'at_risk_alert' | 'general';
export type SyncStatus = 'synced' | 'pending' | 'conflict';

export interface AuthPayload {
  id: string;
  email: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}
