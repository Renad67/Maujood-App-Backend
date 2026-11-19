import Joi from 'joi';

export const scanQrSchema = Joi.object({
  qrToken: Joi.string().required(),
});

export const updateBusinessProfileSchema = Joi.object({
  name: Joi.string().min(2).max(120).optional(),
  phone: Joi.string().optional(),
  businessDescription: Joi.string().optional(),
  businessAddresses: Joi.array().items(Joi.string()).optional(),
  businessLocations: Joi.array()
    .items(
      Joi.object({
        label: Joi.string().required(),
        coordinates: Joi.array().items(Joi.number()).length(2).required(),
      })
    )
    .optional(),
});

