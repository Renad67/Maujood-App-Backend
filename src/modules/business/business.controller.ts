import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware';
import { UserRole } from '../../DB/models/User.model';
import { validate } from '../../middleware/validation.middleware';
import { scanQrSchema } from './business.validation';
import * as businessService from './business.service';

const router = Router();

// Customer & Public Business Profile Routes
router.get('/public/:id', businessService.getPublicBusinessProfile);
router.post('/public/:id/love', authenticate, businessService.toggleLoveBusiness);

// Business Owner Dashboard Routes
router.use(authenticate, authorizeRoles(UserRole.BUSINESS));
router.get('/dashboard', businessService.getDashboardStats);
router.get('/offers', businessService.getMyBusinessOffers);
router.get('/orders', businessService.getBusinessOrders);
router.post('/scan-qr', validate(scanQrSchema), businessService.scanCustomerQr);

export default router;
