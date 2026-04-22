import { Router } from 'express';
import * as patientsController from './patients.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', patientsController.listPatients);
router.post('/', patientsController.createPatient);
router.get('/:id', patientsController.getPatient);
router.patch('/:id', patientsController.updatePatient);
router.delete('/:id', requireRole('admin'), patientsController.deletePatient);
router.patch('/:id/at-risk', requireRole('admin', 'health_worker'), patientsController.setAtRisk);

export default router;
