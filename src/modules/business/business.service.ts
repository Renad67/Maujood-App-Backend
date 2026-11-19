import { Response } from 'express';
import mongoose from 'mongoose';
import { OfferModel } from '../../DB/models/Offer.model';
import { OrderModel, OrderStatus } from '../../DB/models/Order.model';
import { UserModel, UserRole, BusinessStatus } from '../../DB/models/User.model';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError, asyncHandler } from '../../utils/AppError';
import { verifySignedQrToken } from '../../utils/qr.util';
import { sendPushNotification } from '../../utils/fcm.util';

export const getDashboardStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  const businessId = req.user._id;
  const [totalOffers, offerAgg, orderAgg, businessDoc, recentOffers] = await Promise.all([
    OfferModel.countDocuments({ businessId }),
    OfferModel.aggregate([
      { $match: { businessId } },
      { $project: { likesCount: { $size: { $ifNull: ['$likes', []] } } } },
      { $group: { _id: null, totalOfferLoves: { $sum: '$likesCount' } } },
    ]),
    OrderModel.aggregate([
      { $match: { businessId, status: OrderStatus.REDEEMED } },
      { $group: { _id: null, totalScans: { $sum: 1 }, totalSales: { $sum: '$pricePaid' } } },
    ]),
    UserModel.findById(businessId).select('loves'),
    OfferModel.find({ businessId }).sort({ createdAt: -1 }).limit(6),
  ]);

  const totalLoves = (offerAgg[0]?.totalOfferLoves || 0) + (businessDoc?.loves?.length || 0);

  res.status(200).json({
    success: true,
    data: {
      totalScans: orderAgg[0]?.totalScans || 0,
      totalSales: orderAgg[0]?.totalSales || 0,
      totalOffers,
      totalLoves,
      recentOffers,
    },
  });
});

export const getMyBusinessOffers = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const filter: Record<string, any> = { businessId: req.user._id };
  if (req.query.tag) filter.tags = req.query.tag;
  if (req.query.subCategoryId) filter.subCategoryId = req.query.subCategoryId;

  const offers = await OfferModel.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: offers });
});

export const getPublicBusinessProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const business = await UserModel.findOne({
    _id: req.params.id,
    role: UserRole.BUSINESS,
    businessStatus: BusinessStatus.APPROVED,
  })
    .select(
      'name businessLogo businessCover businessDescription businessAddresses businessLocations businessCategory businessSubCategory loves phone'
    )
    .populate('businessCategory', 'name icon')
    .populate('businessSubCategory', 'name icon');

  if (!business) throw new AppError('Business not found', 404);

  const offerFilter: Record<string, any> = { businessId: business._id, isHidden: false };
  if (req.query.tag) offerFilter.tags = req.query.tag;
  if (req.query.subCategoryId) offerFilter.subCategoryId = req.query.subCategoryId;

  const offers = await OfferModel.find(offerFilter).sort({ createdAt: -1 });
  const availableTags = await OfferModel.distinct('tags', { businessId: business._id, isHidden: false });

  res.status(200).json({
    success: true,
    data: {
      business,
      lovesCount: business.loves?.length || 0,
      availableTags,
      offers,
    },
  });
});

export const toggleLoveBusiness = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const business = await UserModel.findOne({ _id: req.params.id, role: UserRole.BUSINESS });
  if (!business) throw new AppError('Business not found', 404);

  const userId = req.user._id;
  const idx = business.loves.findIndex((id) => id.toString() === userId.toString());
  if (idx === -1) {
    business.loves.push(userId);
  } else {
    business.loves.splice(idx, 1);
  }

  await business.save();
  res.status(200).json({ success: true, loved: idx === -1, lovesCount: business.loves.length });
});

export const getBusinessOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  const orders = await OrderModel.find({ businessId: req.user._id })
    .populate('customerId', 'name email phone city avatar')
    .populate('offerId', 'title priceBefore priceAfter image')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: orders });
});

export const scanCustomerQr = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  const { qrToken } = req.body;
  const decoded = verifySignedQrToken<{
    type: 'OFFER_CLAIM' | 'USER_IDENTITY';
    offerId?: string;
    customerId?: string;
    userId?: string;
    businessId?: string;
  }>(qrToken);

  let session: mongoose.ClientSession | null = null;
  let useTransaction = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTransaction = true;
  } catch {
    if (session) {
      session.endSession();
      session = null;
    }
  }

  try {
    if (decoded.type === 'OFFER_CLAIM') {
      const orderQuery = OrderModel.findOne({
        qrToken,
        businessId: req.user._id,
      });
      if (useTransaction && session) orderQuery.session(session);
      const order = await orderQuery;

      if (!order) {
        throw new AppError('Order claim not found for this business', 404);
      }
      if (order.status === OrderStatus.REDEEMED) {
        throw new AppError('This offer QR has already been redeemed', 400);
      }

      order.status = OrderStatus.REDEEMED;
      order.scannedAt = new Date();
      if (useTransaction && session) {
        await order.save({ session });
      } else {
        await order.save();
      }

      const updateOpts = useTransaction && session ? { new: true, session } : { new: true };
      const customer = await UserModel.findByIdAndUpdate(
        order.customerId,
        { $inc: { points: order.pointsAwarded, scansCount: 1 } },
        updateOpts
      );

      const bizOpts = useTransaction && session ? { session } : undefined;
      await UserModel.findByIdAndUpdate(
        req.user._id,
        { $inc: { scansCount: 1 } },
        bizOpts
      );

      if (useTransaction && session) {
        await session.commitTransaction();
      }

      if (customer?.fcmTokens?.length) {
        await sendPushNotification(
          customer.fcmTokens,
          'Offer Redeemed!',
          `You earned ${order.pointsAwarded} points at ${req.user.name}!`
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Offer QR scanned and redeemed successfully',
        data: { order, customerPoints: customer?.points },
      });
    }

    // Direct Customer Identity QR Scan (Loyalty points reward)
    const targetUserId = decoded.userId || decoded.customerId;
    if (!targetUserId) {
      throw new AppError('Invalid user identity QR payload', 400);
    }

    const updateOpts = useTransaction && session ? { new: true, session } : { new: true };
    const customer = await UserModel.findByIdAndUpdate(
      targetUserId,
      { $inc: { points: 10, scansCount: 1 } },
      updateOpts
    );

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const bizOpts = useTransaction && session ? { session } : undefined;
    await UserModel.findByIdAndUpdate(
      req.user._id,
      { $inc: { scansCount: 1 } },
      bizOpts
    );

    if (useTransaction && session) {
      await session.commitTransaction();
    }

    res.status(200).json({
      success: true,
      message: 'Customer loyalty QR scanned (+10 points)',
      data: { customerName: customer.name, totalPoints: customer.points },
    });
  } catch (err) {
    if (useTransaction && session) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (session) {
      session.endSession();
    }
  }
});
