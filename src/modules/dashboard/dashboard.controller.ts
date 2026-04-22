import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import * as dashboardService from './dashboard.service';
import { sendSuccess } from '../../utils/response';

export const getDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await dashboardService.getDashboardStats();
    sendSuccess(res, stats);
  } catch (err) { next(err); }
};
