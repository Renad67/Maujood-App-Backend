import { Router } from 'express';
import * as authService from './auth.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  userSignupSchema,
  businessSignupSchema,
  loginSchema,
  googleAuthSchema,
  facebookAuthSchema,
  logoutSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation';
import { upload } from '../../utils/cloud.util';

const router = Router();

router.post('/signup/user', validate(userSignupSchema), authService.registerCustomer);
router.post(
  '/signup/business',
  upload.fields([
    { name: 'businessLogo', maxCount: 1 },
    { name: 'businessCover', maxCount: 1 },
  ]),
  validate(businessSignupSchema),
  authService.registerBusiness
);
router.post('/login', validate(loginSchema), authService.login);
router.post('/social/google', validate(googleAuthSchema), authService.googleSocialAuth);
router.post('/social/facebook', validate(facebookAuthSchema), authService.facebookSocialAuth);
router.post('/logout', authenticate, validate(logoutSchema), authService.logout);
router.post('/verify-otp', validate(verifyOtpSchema), authService.verifyEmailOtp);
router.post('/forgot-password', validate(forgotPasswordSchema), authService.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authService.resetPassword);

export default router;
