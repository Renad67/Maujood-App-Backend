import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware';
import { UserRole } from '../../DB/models/User.model';
import { validate } from '../../middleware/validation.middleware';
import { broadcastNotificationSchema } from './notification.validation';
import * as notificationService from './notification.service';

const router = Router();

router.get('/', authenticate, notificationService.getMyNotifications);
router.patch('/read-all', authenticate, notificationService.markAllNotificationsRead);
router.patch('/:id/read', authenticate, notificationService.markNotificationRead);
router.post(
  '/broadcast',
  authenticate,
  authorizeRoles(UserRole.SUPER_ADMIN),
  validate(broadcastNotificationSchema),
  notificationService.adminBroadcastNotification
);

export default router;
