import Joi from 'joi';
import { Gender } from '../../DB/models/User.model';

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().optional(),
  city: Joi.string().optional(),
  address: Joi.string().optional(),
  gender: Joi.string().valid(...Object.values(Gender)).optional(),
  language: Joi.string().valid('English', 'Arabic', 'en', 'ar', 'English (US)', 'English (UK)').optional(),
});

export const selectTopicsSchema = Joi.object({
  topics: Joi.array().items(Joi.string()).min(4).required(),
});

export const updateNotificationPrefsSchema = Joi.object({
  general: Joi.boolean().optional(),
  sound: Joi.boolean().optional(),
  vibrate: Joi.boolean().optional(),
});

