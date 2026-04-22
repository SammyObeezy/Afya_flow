import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import * as notificationsService from './notifications.service';
import { sendSuccess } from '../../utils/response';
import { getPagination } from '../../utils/pagination';

const getParam = (val: string | string[] | undefined): string => {
  const v = Array.isArray(val) ? val[0] : val;
  return v ?? '';
};

export const listNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pagination = getPagination(req);
    const unreadOnly = req.query['unread'] === 'true';
    const { notifications, total } = await notificationsService.getNotifications(req.user!.id, pagination, unreadOnly);
    sendSuccess(res, notifications, 200, undefined, {
      total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit),
    });
  } catch (err) { next(err); }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = getParam(req.params['id']);
    const result = await notificationsService.markAsRead(id, req.user!.id);
    sendSuccess(res, result, 200, 'Notification marked as read');
  } catch (err) { next(err); }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await notificationsService.markAllAsRead(req.user!.id);
    sendSuccess(res, result, 200, 'All notifications marked as read');
  } catch (err) { next(err); }
};

export const triggerMissedVisitCheck = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await notificationsService.checkMissedVisits();
    sendSuccess(res, result, 200, 'Missed visit check completed');
  } catch (err) { next(err); }
};
