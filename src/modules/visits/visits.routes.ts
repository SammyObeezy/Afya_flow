import { Router } from 'express';
import * as visitsController from './visits.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/', visitsController.createVisit);
router.get('/patient/:patientId', visitsController.getPatientVisits);
router.post('/medical-records', visitsController.createMedicalRecord);
router.get('/medical-records/:patientId', visitsController.getPatientMedicalRecords);
router.post('/notes/:patientId', visitsController.addNote);

export default router;
