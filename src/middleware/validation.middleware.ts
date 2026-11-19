import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { AppError } from '../utils/AppError';

export const validate = (schema: ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const data = { ...req.body, ...req.params, ...req.query };
    const { error } = schema.validate(data, { abortEarly: false, allowUnknown: true });
    if (error) {
      const messages = error.details.map((d) => d.message).join(', ');
      return next(new AppError(`Validation Error: ${messages}`, 400));
    }
    next();
  };
};

