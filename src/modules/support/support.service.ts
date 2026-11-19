import { Request, Response } from 'express';
import { ContactMessageModel } from '../../DB/models/ContactMessage.model';
import { AppSettingsModel } from '../../DB/models/AppSettings.model';
import { AuthRequest } from '../../middleware/auth.middleware';
import { asyncHandler, AppError } from '../../utils/AppError';

export const submitContactUs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, subject, message } = req.body;
  if (!subject || !message) {
    throw new AppError('Subject and message are required', 400);
  }

  const ticket = await ContactMessageModel.create({
    userId: req.user?._id,
    name: name || req.user?.name || 'Guest User',
    email: email || req.user?.email || 'no-email@moujood.net',
    subject: subject.trim(),
    message: message.trim(),
  });

  res.status(201).json({
    success: true,
    message: 'Your message has been sent to Moujood support',
    data: ticket,
  });
});

export const getLegalDocument = asyncHandler(async (req: Request, res: Response) => {
  const key = req.params.key.toUpperCase(); // PRIVACY_POLICY | TERMS_AND_CONDITIONS
  const doc = await AppSettingsModel.findOne({ key });
  res.status(200).json({
    success: true,
    data: doc || {
      key,
      contentEn: 'Moujood legal policy.',
      contentAr: 'سياسة تطبيق موجود الرسمية.',
    },
  });
});

export const upsertLegalDocument = asyncHandler(async (req: Request, res: Response) => {
  const { key, contentEn, contentAr } = req.body;
  if (!key || !contentEn || !contentAr) {
    throw new AppError('Key, contentEn, and contentAr are required', 400);
  }

  const doc = await AppSettingsModel.findOneAndUpdate(
    { key: key.toUpperCase() },
    { contentEn, contentAr },
    { upsert: true, new: true }
  );

  res.status(200).json({ success: true, data: doc });
});

