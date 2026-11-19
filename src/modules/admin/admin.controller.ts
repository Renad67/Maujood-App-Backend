import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware';
import { UserRole } from '../../DB/models/User.model';
import { validate } from '../../middleware/validation.middleware';
import { updateBusinessApprovalSchema, updatePostPointsSchema } from './admin.validation';
import * as adminService from './admin.service';

const router = Router();

router.use(authenticate, authorizeRoles(UserRole.SUPER_ADMIN));

router.get('/users', adminService.getUsersAnalyticsAndTable);
router.get('/businesses', adminService.listBusinesses);
router.patch(
  '/businesses/:id/approval',
  validate(updateBusinessApprovalSchema),
  adminService.updateBusinessApproval
);

router.patch('/posts/:id/hide', adminService.toggleHidePost);
router.patch('/posts/:id/points', validate(updatePostPointsSchema), adminService.updatePostPoints);
router.delete('/posts/:id', adminService.deletePost);

export default router;

