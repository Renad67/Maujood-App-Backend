import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware';
import { UserRole } from '../../DB/models/User.model';
import { upload } from '../../utils/cloud.util';
import * as homeService from './home.service';

const router = Router();

router.get('/', homeService.getHomeOverview);
router.get('/search', homeService.globalSearch);
router.get('/banners', homeService.getBanners);
router.post(
  '/banners',
  authenticate,
  authorizeRoles(UserRole.SUPER_ADMIN),
  upload.single('image'),
  homeService.createBanner
);
router.delete(
  '/banners/:id',
  authenticate,
  authorizeRoles(UserRole.SUPER_ADMIN),
  homeService.deleteBanner
);

export default router;

