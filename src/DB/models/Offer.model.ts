import { Schema, model, Document, Types } from 'mongoose';

export interface IOffer extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  image: { secure_url: string; public_id: string };
  mediaType: 'IMAGE' | 'VIDEO';
  priceBefore: number;
  priceAfter: number;
  currency: string;
  businessId: Types.ObjectId;
  categoryId: Types.ObjectId;
  subCategoryId?: Types.ObjectId;
  tags: string[];
  pointsReward: number;
  viewsCount: number;
  claimsCount: number;
  likes: Types.ObjectId[];
  commentsCount: number;
  isHidden: boolean;
  address?: string;
  location?: string;
  discountPercentage?: number;
  createdAt: Date;
  updatedAt: Date;
}

const offerSchema = new Schema<IOffer>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    image: {
      secure_url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    mediaType: { type: String, enum: ['IMAGE', 'VIDEO'], default: 'IMAGE', index: true },
    priceBefore: { type: Number, required: true, min: 0 },
    priceAfter: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'EGP' },
    businessId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    subCategoryId: { type: Schema.Types.ObjectId, ref: 'SubCategory', index: true },
    tags: [{ type: String, trim: true, index: true }],
    pointsReward: { type: Number, default: 10, min: 0 },
    viewsCount: { type: Number, default: 0 },
    claimsCount: { type: Number, default: 0 },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    commentsCount: { type: Number, default: 0 },
    isHidden: { type: Boolean, default: false, index: true },
    address: { type: String },
    location: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

offerSchema.virtual('discountPercentage').get(function (this: IOffer) {
  if (!this.priceBefore || this.priceBefore <= 0) return 0;
  return Math.round(((this.priceBefore - this.priceAfter) / this.priceBefore) * 100);
});

offerSchema.index({ title: 'text', description: 'text', tags: 'text' });

export const OfferModel = model<IOffer>('Offer', offerSchema);
