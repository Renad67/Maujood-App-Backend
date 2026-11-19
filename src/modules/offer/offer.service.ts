import { Response } from 'express';
import { OfferModel } from '../../DB/models/Offer.model';
import { OrderModel, OrderStatus } from '../../DB/models/Order.model';
import { UserModel, BusinessStatus } from '../../DB/models/User.model';
import { CommentModel } from '../../DB/models/Comment.model';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError, asyncHandler } from '../../utils/AppError';
import { uploadToCloud, deleteFromCloud } from '../../utils/cloud.util';
import { createSignedQrToken, generateQrDataUrl } from '../../utils/qr.util';

export const createOffer = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }
  if (req.user.businessStatus !== BusinessStatus.APPROVED) {
    throw new AppError('Your business account must be approved by Super Admin before posting offers', 403);
  }
  if (!req.file) {
    throw new AppError('Offer media (image or video) is required', 400);
  }

  const isVideo = req.file.mimetype.startsWith('video/');
  const mediaType = isVideo ? 'VIDEO' : 'IMAGE';
  const resourceType = isVideo ? 'video' : 'image';

  const image = await uploadToCloud(req.file.buffer, 'offers', resourceType);

  const categoryId = req.body.categoryId || req.user.businessCategory;
  if (!categoryId) {
    throw new AppError('Category is required for this offer', 400);
  }

  let tags: string[] = [];
  if (Array.isArray(req.body.tags)) {
    tags = req.body.tags;
  } else if (typeof req.body.tags === 'string') {
    try {
      const parsed = JSON.parse(req.body.tags);
      tags = Array.isArray(parsed) ? parsed : [req.body.tags];
    } catch {
      tags = req.body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
  }

  const offer = await OfferModel.create({
    ...req.body,
    categoryId,
    tags,
    mediaType,
    currency: req.body.currency || 'EGP',
    image,
    businessId: req.user._id,
  });

  res.status(201).json({ success: true, message: 'Offer published', data: offer });
});

export const updateOffer = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  const offer = await OfferModel.findOne({ _id: req.params.id, businessId: req.user._id });
  if (!offer) {
    throw new AppError('Offer not found or unauthorized', 404);
  }

  if (req.file) {
    await deleteFromCloud(offer.image.public_id);
    const isVideo = req.file.mimetype.startsWith('video/');
    offer.mediaType = isVideo ? 'VIDEO' : 'IMAGE';
    offer.image = await uploadToCloud(req.file.buffer, 'offers', isVideo ? 'video' : 'image');
  }

  if (req.body.tags) {
    if (Array.isArray(req.body.tags)) {
      offer.tags = req.body.tags;
    } else if (typeof req.body.tags === 'string') {
      try {
        const parsed = JSON.parse(req.body.tags);
        offer.tags = Array.isArray(parsed) ? parsed : [req.body.tags];
      } catch {
        offer.tags = req.body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      }
    }
    delete req.body.tags;
  }

  Object.assign(offer, req.body);
  await offer.save();
  res.status(200).json({ success: true, message: 'Offer updated', data: offer });
});

export const getFeedOffers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { categoryId, subCategoryId, businessId, search, tag, page = 1, limit = 10 } = req.query;
  const filter: Record<string, any> = { isHidden: false };

  if (categoryId) filter.categoryId = categoryId;
  if (subCategoryId) filter.subCategoryId = subCategoryId;
  if (businessId) filter.businessId = businessId;
  if (tag) filter.tags = tag;
  if (search) {
    filter.$or = [
      { title: { $regex: search as string, $options: 'i' } },
      { description: { $regex: search as string, $options: 'i' } },
      { tags: { $regex: search as string, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [offers, total] = await Promise.all([
    OfferModel.find(filter)
      .populate('businessId', 'name businessLogo businessAddresses')
      .populate('categoryId', 'name')
      .populate('subCategoryId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    OfferModel.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      offers,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      total,
    },
  });
});

export const getOfferById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const offer = await OfferModel.findById(req.params.id)
    .populate('businessId', 'name businessLogo businessCover businessDescription businessAddresses businessPhone loves')
    .populate('categoryId', 'name')
    .populate('subCategoryId', 'name');

  if (!offer) {
    throw new AppError('Offer not found', 404);
  }

  offer.viewsCount += 1;
  await offer.save();

  res.status(200).json({ success: true, data: offer });
});

export const toggleLikeOffer = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  const offer = await OfferModel.findById(req.params.id);
  if (!offer) {
    throw new AppError('Offer not found', 404);
  }

  const userId = req.user._id;
  const idx = offer.likes.findIndex((id) => id.toString() === userId.toString());
  if (idx === -1) {
    offer.likes.push(userId);
  } else {
    offer.likes.splice(idx, 1);
  }

  await offer.save();
  res.status(200).json({ success: true, likesCount: offer.likes.length, liked: idx === -1 });
});

export const toggleSaveOffer = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const offerId = req.params.id;
  const user = await UserModel.findById(req.user._id);
  if (!user) throw new AppError('User not found', 404);

  const idx = user.savedOffers.findIndex((id) => id.toString() === offerId);
  if (idx === -1) {
    user.savedOffers.push(offerId as any);
  } else {
    user.savedOffers.splice(idx, 1);
  }

  await user.save();
  res.status(200).json({ success: true, saved: idx === -1 });
});

export const getOfferComments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const comments = await CommentModel.find({ offerId: req.params.id })
    .populate('userId', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  res.status(200).json({ success: true, data: comments });
});

export const addOfferComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const { content } = req.body;
  if (!content?.trim()) throw new AppError('Comment content is required', 400);

  const offer = await OfferModel.findById(req.params.id);
  if (!offer) throw new AppError('Offer not found', 404);

  const comment = await CommentModel.create({
    offerId: offer._id,
    userId: req.user._id,
    content: content.trim(),
  });

  offer.commentsCount += 1;
  await offer.save();

  await comment.populate('userId', 'name avatar');
  res.status(201).json({ success: true, data: comment });
});

export const deleteOfferComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const comment = await CommentModel.findOneAndDelete({
    _id: req.params.commentId,
    userId: req.user._id,
  });
  if (!comment) throw new AppError('Comment not found or unauthorized', 404);

  await OfferModel.findByIdAndUpdate(comment.offerId, { $inc: { commentsCount: -1 } });
  res.status(200).json({ success: true, message: 'Comment deleted' });
});

export const getReelsFeed = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const reels = await OfferModel.find({ isHidden: false })
    .populate('businessId', 'name businessLogo businessAddresses')
    .sort({ mediaType: -1, createdAt: -1 }) // Prioritizes VIDEO reels first
    .skip(skip)
    .limit(Number(limit));

  res.status(200).json({ success: true, data: reels });
});

export const claimOffer = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  const offer = await OfferModel.findOne({ _id: req.params.id, isHidden: false });
  if (!offer) {
    throw new AppError('Offer not available', 404);
  }

  const qrToken = createSignedQrToken({
    type: 'OFFER_CLAIM',
    offerId: offer._id.toString(),
    customerId: req.user._id.toString(),
    businessId: offer.businessId.toString(),
    nonce: Date.now(),
  });

  const order = await OrderModel.create({
    customerId: req.user._id,
    businessId: offer.businessId,
    offerId: offer._id,
    status: OrderStatus.CLAIMED,
    pointsAwarded: offer.pointsReward,
    pricePaid: offer.priceAfter,
    qrToken,
  });

  offer.claimsCount += 1;
  await offer.save();

  const qrImage = await generateQrDataUrl(qrToken);
  res.status(201).json({
    success: true,
    message: 'Offer claimed! Present this QR code at the business to redeem.',
    data: { order, qrImage },
  });
});
