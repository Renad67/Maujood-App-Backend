import { Schema, model, Document, Types } from 'mongoose';

export interface ISubCategory extends Document {
  _id: Types.ObjectId;
  name: string;
  categoryId: Types.ObjectId;
  icon?: { secure_url: string; public_id: string };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subCategorySchema = new Schema<ISubCategory>(
  {
    name: { type: String, required: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    icon: { secure_url: String, public_id: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subCategorySchema.index({ name: 1, categoryId: 1 }, { unique: true });

export const SubCategoryModel = model<ISubCategory>('SubCategory', subCategorySchema);

