import Joi from 'joi';

export const createOfferSchema = Joi.object({
  title: Joi.string().min(3).max(150).required(),
  description: Joi.string().min(10).required(),
  priceBefore: Joi.number().positive().required(),
  priceAfter: Joi.number().min(0).less(Joi.ref('priceBefore')).required(),
  categoryId: Joi.string().hex().length(24).optional().allow(''),
  subCategoryId: Joi.string().hex().length(24).optional().allow(''),
  tags: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
  currency: Joi.string().default('EGP').optional(),
  mediaType: Joi.string().valid('IMAGE', 'VIDEO').optional(),
  address: Joi.string().optional().allow(''),
  location: Joi.string().optional().allow(''),
  pointsReward: Joi.number().min(0).optional(),
});

export const updateOfferSchema = Joi.object({
  title: Joi.string().min(3).max(150).optional(),
  description: Joi.string().min(10).optional(),
  priceBefore: Joi.number().positive().optional(),
  priceAfter: Joi.number().min(0).optional(),
  categoryId: Joi.string().hex().length(24).optional().allow(''),
  subCategoryId: Joi.string().hex().length(24).optional().allow(''),
  tags: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
  currency: Joi.string().optional(),
  mediaType: Joi.string().valid('IMAGE', 'VIDEO').optional(),
  address: Joi.string().optional().allow(''),
  location: Joi.string().optional().allow(''),
  pointsReward: Joi.number().min(0).optional(),
  isHidden: Joi.boolean().optional(),
});

export const addCommentSchema = Joi.object({
  content: Joi.string().trim().min(1).max(500).required(),
});
