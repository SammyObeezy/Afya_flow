import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import { createVisitSchema, createMedicalRecordSchema } from './visits.schema';
import * as visitsService from './visits.service';
import { sendSuccess } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { z } from 'zod';

const getParam = (val: string | string[] | undefined): string => {
  const v = Array.isArray(val) ? val[0] : val;
  return v ?? '';
};

export const createVisit = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createVisitSchema.parse(req.body);
    const visit = await visitsService.createVisit(input, req.user!.id);
    sendSuccess(res, visit, 201, 'Visit recorded successfully');
  } catch (err) { next(err); }
};

export const getPatientVisits = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patientId = getParam(req.params['patientId']);
    const pagination = getPagination(req);
    const { visits, total } = await visitsService.getPatientVisits(patientId, pagination);
    sendSuccess(res, visits, 200, undefined, { total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) });
  } catch (err) { next(err); }
};

export const createMedicalRecord = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createMedicalRecordSchema.parse(req.body);
    const record = await visitsService.createMedicalRecord(input);
    sendSuccess(res, record, 201, 'Medical record created');
  } catch (err) { next(err); }
};

export const getPatientMedicalRecords = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patientId = getParam(req.params['patientId']);
    const pagination = getPagination(req);
    const { records, total } = await visitsService.getPatientMedicalRecords(patientId, pagination);
    sendSuccess(res, records, 200, undefined, { total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) });
  } catch (err) { next(err); }
};

export const addNote = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patientId = getParam(req.params['patientId']);
    const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
    const note = await visitsService.addNote(patientId, content);
    sendSuccess(res, note, 201, 'Note added');
  } catch (err) { next(err); }
};
