import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware';
import { UserRole } from '../../DB/models/User.model';
import * as supportService from './support.service';

const router = Router();

router.post('/contact', authenticate, supportService.submitContactUs);
router.get('/legal/:key', supportService.getLegalDocument);
router.put(
  '/legal',
  authenticate,
  authorizeRoles(UserRole.SUPER_ADMIN),
  supportService.upsertLegalDocument
);

export default router;

