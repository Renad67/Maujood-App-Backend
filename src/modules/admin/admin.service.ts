import { Response } from 'express';
import { UserModel, UserRole, Gender, BusinessStatus } from '../../DB/models/User.model';
import { OfferModel } from '../../DB/models/Offer.model';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError, asyncHandler } from '../../utils/AppError';
import { sendEmail } from '../../utils/email.util';
import { sendPushNotification } from '../../utils/fcm.util';
import { deleteFromCloud } from '../../utils/cloud.util';

const calculateWeeklyGrowth = (currentWeek: number, previousWeek: number): number => {
  if (previousWeek === 0) return currentWeek > 0 ? 100 : 0;
  return Number((((currentWeek - previousWeek) / previousWeek) * 100).toFixed(1));
};

export const getUsersAnalyticsAndTable = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { city, search, page = 1, limit = 9 } = req.query;
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalWomen,
    totalMen,
    usersThisWeek,
    usersLastWeek,
  ] = await Promise.all([
    UserModel.countDocuments({ role: UserRole.CUSTOMER }),
    UserModel.countDocuments({ role: UserRole.CUSTOMER, gender: Gender.FEMALE }),
    UserModel.countDocuments({ role: UserRole.CUSTOMER, gender: Gender.MALE }),
    UserModel.countDocuments({ role: UserRole.CUSTOMER, createdAt: { $gte: oneWeekAgo } }),
    UserModel.countDocuments({
      role: UserRole.CUSTOMER,
      createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo },
    }),
  ]);

  const filter: Record<string, any> = { role: UserRole.CUSTOMER };
  if (city) {
    filter.city = { $regex: city as string, $options: 'i' };
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search as string, $options: 'i' } },
      { email: { $regex: search as string, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, filteredTotal] = await Promise.all([
    UserModel.find(filter)
      .select('name email city scansCount points gender createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    UserModel.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      metrics: {
        totalUsers: { count: totalUsers, weeklyChangePercent: calculateWeeklyGrowth(usersThisWeek, usersLastWeek) },
        totalWomenUsers: { count: totalWomen },
        totalMenUsers: { count: totalMen },
      },
      table: {
        users,
        page: Number(page),
        limit: Number(limit),
        totalCount: filteredTotal,
        totalPages: Math.ceil(filteredTotal / Number(limit)),
      },
    },
  });
});

export const listBusinesses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const filter: Record<string, any> = { role: UserRole.BUSINESS };
  if (req.query.status) {
    filter.businessStatus = req.query.status;
  }

  const businesses = await UserModel.find(filter)
    .populate('businessCategory', 'name icon')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: businesses });
});

export const updateBusinessApproval = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (![BusinessStatus.APPROVED, BusinessStatus.REJECTED].includes(status)) {
    throw new AppError('Invalid business status. Must be APPROVED or REJECTED', 400);
  }

  const business = await UserModel.findOneAndUpdate(
    { _id: req.params.id, role: UserRole.BUSINESS },
    { businessStatus: status },
    { new: true }
  );
  if (!business) {
    throw new AppError('Business not found', 404);
  }

  await sendEmail(
    business.email,
    `Moujood Business Account ${status}`,
    `<p>Hello ${business.name}, your business account application has been: <b>${status}</b>.</p>`
  );

  if (business.fcmTokens?.length) {
    await sendPushNotification(
      business.fcmTokens,
      'Business Application Status',
      `Your Moujood business profile has been ${status.toLowerCase()}.`
    );
  }

  res.status(200).json({ success: true, message: `Business status updated to ${status}`, data: business });
});

export const toggleHidePost = asyncHandler(async (req: AuthRequest, res: Response) => {
  const offer = await OfferModel.findById(req.params.id);
  if (!offer) {
    throw new AppError('Post/Offer not found', 404);
  }

  offer.isHidden = !offer.isHidden;
  await offer.save();

  res.status(200).json({
    success: true,
    message: `Offer visibility set to ${offer.isHidden ? 'Hidden' : 'Visible'}`,
    data: offer,
  });
});

export const updatePostPoints = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { pointsReward } = req.body;
  const offer = await OfferModel.findByIdAndUpdate(
    req.params.id,
    { pointsReward: Number(pointsReward) },
    { new: true }
  );
  if (!offer) {
    throw new AppError('Post/Offer not found', 404);
  }

  res.status(200).json({ success: true, message: 'Offer points updated', data: offer });
});

export const deletePost = asyncHandler(async (req: AuthRequest, res: Response) => {
  const offer = await OfferModel.findByIdAndDelete(req.params.id);
  if (!offer) {
    throw new AppError('Post/Offer not found', 404);
  }

  if (offer.image?.public_id) {
    await deleteFromCloud(offer.image.public_id);
  }
  res.status(200).json({ success: true, message: 'Post deleted permanently' });
});

