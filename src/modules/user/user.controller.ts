import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  updateProfileSchema,
  selectTopicsSchema,
  updateNotificationPrefsSchema,
} from './user.validation';
import { upload } from '../../utils/cloud.util';
import * as userService from './user.service';

const router = Router();

router.use(authenticate);
router.get('/profile', userService.getProfile);
router.put('/profile', validate(updateProfileSchema), userService.updateProfile);
router.patch('/avatar', upload.single('avatar'), userService.updateAvatar);
router.get('/saved-offers', userService.getSavedOffers);
router.put('/topics', validate(selectTopicsSchema), userService.updateTopics);
router.put(
  '/notification-preferences',
  validate(updateNotificationPrefsSchema),
  userService.updateNotificationPrefs
);

export default router;
