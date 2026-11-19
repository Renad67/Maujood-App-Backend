import { Schema, model, Document, Types } from 'mongoose';

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  icon?: { secure_url: string; public_id: string };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    icon: { secure_url: String, public_id: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const CategoryModel = model<ICategory>('Category', categorySchema);

