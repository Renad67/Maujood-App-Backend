import { Schema, model, Document, Types } from 'mongoose';

export interface IBanner extends Document {
  _id: Types.ObjectId;
  title?: string;
  image: { secure_url: string; public_id: string };
  linkOfferId?: Types.ObjectId;
  linkBusinessId?: Types.ObjectId;
  placement: 'HOME' | 'EXPLORE' | 'BOTH';
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    title: { type: String, trim: true },
    image: {
      secure_url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    linkOfferId: { type: Schema.Types.ObjectId, ref: 'Offer' },
    linkBusinessId: { type: Schema.Types.ObjectId, ref: 'User' },
    placement: { type: String, enum: ['HOME', 'EXPLORE', 'BOTH'], default: 'BOTH' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const BannerModel = model<IBanner>('Banner', bannerSchema);

