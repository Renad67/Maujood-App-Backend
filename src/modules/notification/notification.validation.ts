import Joi from 'joi';

export const broadcastNotificationSchema = Joi.object({
  title: Joi.string().min(2).max(120).required(),
  body: Joi.string().min(2).required(),
  segment: Joi.string().valid('ALL', 'CUSTOMERS', 'BUSINESSES').default('ALL'),
  sendEmailCopy: Joi.boolean().default(false),
});

