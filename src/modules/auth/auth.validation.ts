import Joi from 'joi';
import { Gender } from '../../DB/models/User.model';

export const userSignupSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.any().valid(Joi.ref('password')).required(),
  gender: Joi.string().valid(...Object.values(Gender)).required(),
  city: Joi.string().required(),
  phone: Joi.string().optional(),
  acceptedTerms: Joi.alternatives().try(Joi.boolean().valid(true), Joi.string().valid('true')).required(),
});

export const businessSignupSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.any().valid(Joi.ref('password')).required(),
  businessCategory: Joi.string().hex().length(24).required(),
  businessSubCategory: Joi.string().hex().length(24).optional(),
  businessDescription: Joi.string().required(),
  businessAddresses: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).required(),
  businessLocations: Joi.alternatives().try(Joi.array(), Joi.string()).optional(),
  businessPhone: Joi.string().required(),
  acceptedTerms: Joi.alternatives().try(Joi.boolean().valid(true), Joi.string().valid('true')).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  fcmToken: Joi.string().optional(),
});

export const googleAuthSchema = Joi.object({
  idToken: Joi.string().required(),
  fcmToken: Joi.string().optional(),
});

export const facebookAuthSchema = Joi.object({
  accessToken: Joi.string().required(),
  fcmToken: Joi.string().optional(),
});

export const logoutSchema = Joi.object({
  fcmToken: Joi.string().optional(),
});

export const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otpCode: Joi.string().length(6).required(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  otpCode: Joi.string().length(6).required(),
  newPassword: Joi.string().min(8).required(),
  confirmPassword: Joi.any().valid(Joi.ref('newPassword')).required(),
});
