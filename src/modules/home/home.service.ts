import { Request, Response } from 'express';
import { BannerModel } from '../../DB/models/Banner.model';
import { CategoryModel } from '../../DB/models/Category.model';
import { OfferModel } from '../../DB/models/Offer.model';
import { UserModel, UserRole, BusinessStatus } from '../../DB/models/User.model';
import { asyncHandler, AppError } from '../../utils/AppError';
import { uploadToCloud, deleteFromCloud } from '../../utils/cloud.util';

export const getHomeOverview = asyncHandler(async (_req: Request, res: Response) => {
  const [banners, categories, recommendedBrands] = await Promise.all([
    BannerModel.find({ isActive: true, placement: { $in: ['HOME', 'BOTH'] } }).sort({ sortOrder: 1 }),
    CategoryModel.find({ isActive: true }).limit(6),
    UserModel.find({ role: UserRole.BUSINESS, businessStatus: BusinessStatus.APPROVED })
      .select('name businessLogo businessCover businessCategory loves')
      .populate('businessCategory', 'name icon')
      .limit(10),
  ]);

  res.status(200).json({
    success: true,
    data: { banners, categories, brandsYouMayLike: recommendedBrands },
  });
});

export const globalSearch = asyncHandler(async (req: Request, res: Response) => {
  const q = (req.query.q as string)?.trim();
  if (!q) {
    return res.status(200).json({ success: true, data: { offers: [], businesses: [], categories: [] } });
  }

  const regex = { $regex: q, $options: 'i' };
  const [offers, businesses, categories] = await Promise.all([
    OfferModel.find({ isHidden: false, $or: [{ title: regex }, { description: regex }, { tags: regex }] })
      .populate('businessId', 'name businessLogo')
      .limit(15),
    UserModel.find({ role: UserRole.BUSINESS, businessStatus: BusinessStatus.APPROVED, name: regex })
      .select('name businessLogo businessCover businessCategory loves')
      .populate('businessCategory', 'name')
      .limit(15),
    CategoryModel.find({ isActive: true, name: regex }).limit(10),
  ]);

  res.status(200).json({ success: true, data: { offers, businesses, categories } });
});

export const getBanners = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, any> = { isActive: true };
  if (req.query.placement) {
    filter.placement = { $in: [req.query.placement, 'BOTH'] };
  }
  const banners = await BannerModel.find(filter).sort({ sortOrder: 1 });
  res.status(200).json({ success: true, data: banners });
});

export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('Banner image is required', 400);
  const image = await uploadToCloud(req.file.buffer, 'banners', 'image');
  const banner = await BannerModel.create({ ...req.body, image });
  res.status(201).json({ success: true, data: banner });
});

export const deleteBanner = asyncHandler(async (req: Request, res: Response) => {
  const banner = await BannerModel.findByIdAndDelete(req.params.id);
  if (!banner) throw new AppError('Banner not found', 404);
  await deleteFromCloud(banner.image?.public_id);
  res.status(200).json({ success: true, message: 'Banner deleted' });
});

