import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware';
import { UserRole } from '../../DB/models/User.model';
import { validate } from '../../middleware/validation.middleware';
import { createCategorySchema, createSubCategorySchema } from './category.validation';
import { upload } from '../../utils/cloud.util';
import * as categoryService from './category.service';

const router = Router();

router.get('/', categoryService.getAllCategories);
router.get('/brands', categoryService.getApprovedBrands);
router.get('/:categoryId/sub-categories', categoryService.getSubCategoriesByCategory);

router.post(
  '/',
  authenticate,
  authorizeRoles(UserRole.SUPER_ADMIN),
  upload.single('icon'),
  validate(createCategorySchema),
  categoryService.createCategory
);

router.post(
  '/sub-categories',
  authenticate,
  authorizeRoles(UserRole.SUPER_ADMIN),
  upload.single('icon'),
  validate(createSubCategorySchema),
  categoryService.createSubCategory
);

export default router;

