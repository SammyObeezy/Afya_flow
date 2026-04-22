import { Request, Response, NextFunction } from 'express';
import { signupSchema, loginSchema } from './auth.schema';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import prisma from '../../config/database';

export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = signupSchema.parse(req.body);
    const result = await authService.signup(input);
    sendSuccess(res, result, 201, 'Health worker registered successfully');
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    sendSuccess(res, result, 200, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const me = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const worker = await prisma.healthWorker.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
    });
    if (!worker) { res.status(404).json({ success: false, error: 'Worker not found' }); return; }
    sendSuccess(res, worker);
  } catch (err) {
    next(err);
  }
};
