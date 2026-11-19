import Joi from 'joi';

export const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
});

export const createSubCategorySchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  categoryId: Joi.string().hex().length(24).required(),
});

