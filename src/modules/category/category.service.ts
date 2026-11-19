import { Request, Response } from 'express';
import { CategoryModel } from '../../DB/models/Category.model';
import { SubCategoryModel } from '../../DB/models/SubCategory.model';
import { UserModel, UserRole, BusinessStatus } from '../../DB/models/User.model';
import { asyncHandler } from '../../utils/AppError';
import { uploadToCloud } from '../../utils/cloud.util';

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const icon = req.file ? await uploadToCloud(req.file.buffer, 'categories') : undefined;
  const category = await CategoryModel.create({ name: req.body.name, icon });
  res.status(201).json({ success: true, data: category });
});

export const getAllCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await CategoryModel.find({ isActive: true }).sort({ name: 1 });
  res.status(200).json({ success: true, data: categories });
});

export const createSubCategory = asyncHandler(async (req: Request, res: Response) => {
  const icon = req.file ? await uploadToCloud(req.file.buffer, 'subcategories') : undefined;
  const subCategory = await SubCategoryModel.create({
    name: req.body.name,
    categoryId: req.body.categoryId,
    icon,
  });
  res.status(201).json({ success: true, data: subCategory });
});

export const getSubCategoriesByCategory = asyncHandler(async (req: Request, res: Response) => {
  const subCategories = await SubCategoryModel.find({
    categoryId: req.params.categoryId,
    isActive: true,
  }).sort({ name: 1 });
  res.status(200).json({ success: true, data: subCategories });
});

export const getApprovedBrands = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, any> = {
    role: UserRole.BUSINESS,
    businessStatus: BusinessStatus.APPROVED,
  };
  if (req.query.categoryId) {
    filter.businessCategory = req.query.categoryId;
  }
  if (req.query.search) {
    filter.name = { $regex: req.query.search as string, $options: 'i' };
  }

  const brands = await UserModel.find(filter)
    .select('name businessLogo businessDescription businessCategory businessAddresses businessLocations')
    .populate('businessCategory', 'name icon');
  res.status(200).json({ success: true, data: brands });
});

