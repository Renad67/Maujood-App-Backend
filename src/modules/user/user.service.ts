import { Response } from 'express';
import { UserModel } from '../../DB/models/User.model';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError, asyncHandler } from '../../utils/AppError';
import { createSignedQrToken, generateQrDataUrl } from '../../utils/qr.util';
import { uploadToCloud, deleteFromCloud } from '../../utils/cloud.util';

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  const user = await UserModel.findById(req.user._id).populate('businessCategory', 'name icon');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const qrToken = createSignedQrToken({
    type: 'USER_IDENTITY',
    userId: user._id.toString(),
    points: user.points,
  });
  const qrImage = await generateQrDataUrl(qrToken);

  res.status(200).json({
    success: true,
    data: { user, qrData: { qrToken, qrImage } },
  });
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  const updated = await UserModel.findByIdAndUpdate(req.user._id, req.body, { new: true });
  res.status(200).json({ success: true, message: 'Profile updated', data: updated });
});

export const updateAvatar = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  if (!req.file) throw new AppError('Avatar image is required', 400);

  if (req.user.avatar?.public_id) {
    await deleteFromCloud(req.user.avatar.public_id);
  }

  const avatar = await uploadToCloud(req.file.buffer, 'avatars', 'image');
  const updated = await UserModel.findByIdAndUpdate(req.user._id, { avatar }, { new: true });
  res.status(200).json({ success: true, message: 'Avatar updated', data: updated?.avatar });
});

export const getSavedOffers = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const user = await UserModel.findById(req.user._id).populate({
    path: 'savedOffers',
    match: { isHidden: false },
    populate: { path: 'businessId', select: 'name businessLogo' },
  });
  res.status(200).json({ success: true, data: user?.savedOffers || [] });
});

export const updateTopics = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  const updated = await UserModel.findByIdAndUpdate(
    req.user._id,
    { topics: req.body.topics },
    { new: true }
  );
  res.status(200).json({ success: true, message: 'Topics updated', data: updated?.topics });
});

export const updateNotificationPrefs = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  const updated = await UserModel.findByIdAndUpdate(
    req.user._id,
    { notificationPrefs: req.body },
    { new: true }
  );
  res.status(200).json({ success: true, data: updated?.notificationPrefs });
});
