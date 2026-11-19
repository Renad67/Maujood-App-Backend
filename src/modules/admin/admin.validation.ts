import Joi from 'joi';
import { BusinessStatus } from '../../DB/models/User.model';

export const updateBusinessApprovalSchema = Joi.object({
  status: Joi.string()
    .valid(BusinessStatus.APPROVED, BusinessStatus.REJECTED)
    .required(),
});

export const updatePostPointsSchema = Joi.object({
  pointsReward: Joi.number().min(0).required(),
});

