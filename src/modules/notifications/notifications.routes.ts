import { Router } from 'express';
import * as notificationsController from './notifications.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', notificationsController.listNotifications);
router.patch('/:id/read', notificationsController.markAsRead);
router.patch('/read-all', notificationsController.markAllAsRead);
router.post('/check-missed-visits', requireRole('admin'), notificationsController.triggerMissedVisitCheck);

export default router;
