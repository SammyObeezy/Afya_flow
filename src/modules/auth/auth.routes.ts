import { Router } from 'express';
import * as authController from './auth.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.me);

export default router;
