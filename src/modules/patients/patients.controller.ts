import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import { createPatientSchema, updatePatientSchema, patientFilterSchema } from './patients.schema';
import * as patientsService from './patients.service';
import { sendSuccess, sendError } from '../../utils/response';
import { getPagination } from '../../utils/pagination';

const getParam = (val: string | string[] | undefined): string | undefined =>
  Array.isArray(val) ? val[0] : val;

export const createPatient = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createPatientSchema.parse(req.body);
    const patient = await patientsService.createPatient(input);
    sendSuccess(res, patient, 201, 'Patient created successfully');
  } catch (err) { next(err); }
};

export const listPatients = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = patientFilterSchema.parse(req.query);
    const pagination = getPagination(req);
    const filters = {
      condition: query.condition,
      isAtRisk: query.isAtRisk === 'true' ? true : query.isAtRisk === 'false' ? false : undefined,
      location: query.location,
      search: query.search,
    };
    const { patients, total } = await patientsService.getPatients(filters, pagination);
    sendSuccess(res, patients, 200, undefined, {
      total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit),
    });
  } catch (err) { next(err); }
};

export const getPatient = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = getParam(req.params['id']);
    if (!id) { sendError(res, 'Missing patient id', 400); return; }
    const patient = await patientsService.getPatientById(id);
    sendSuccess(res, patient);
  } catch (err) { next(err); }
};

export const updatePatient = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = getParam(req.params['id']);
    if (!id) { sendError(res, 'Missing patient id', 400); return; }
    const input = updatePatientSchema.parse(req.body);
    const patient = await patientsService.updatePatient(id, input);
    sendSuccess(res, patient, 200, 'Patient updated successfully');
  } catch (err) { next(err); }
};

export const deletePatient = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = getParam(req.params['id']);
    if (!id) { sendError(res, 'Missing patient id', 400); return; }
    const result = await patientsService.softDeletePatient(id);
    sendSuccess(res, result, 200, 'Patient deactivated successfully');
  } catch (err) { next(err); }
};

export const setAtRisk = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = getParam(req.params['id']);
    if (!id) { sendError(res, 'Missing patient id', 400); return; }
    const { isAtRisk } = req.body as { isAtRisk: boolean };
    if (typeof isAtRisk !== 'boolean') { sendError(res, 'isAtRisk must be a boolean', 400); return; }
    const result = await patientsService.markAtRisk(id, isAtRisk);
    sendSuccess(res, result, 200, 'Patient risk status updated');
  } catch (err) { next(err); }
};
