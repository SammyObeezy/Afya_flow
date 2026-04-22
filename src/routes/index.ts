import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import patientsRoutes from '../modules/patients/patients.routes';
import visitsRoutes from '../modules/visits/visits.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/patients', patientsRoutes);
router.use('/visits', visitsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
