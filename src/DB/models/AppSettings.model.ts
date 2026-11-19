import { Schema, model, Document, Types } from 'mongoose';

export interface IAppSettings extends Document {
  _id: Types.ObjectId;
  key: 'PRIVACY_POLICY' | 'TERMS_AND_CONDITIONS';
  contentEn: string;
  contentAr: string;
  createdAt: Date;
  updatedAt: Date;
}

const appSettingsSchema = new Schema<IAppSettings>(
  {
    key: {
      type: String,
      enum: ['PRIVACY_POLICY', 'TERMS_AND_CONDITIONS'],
      unique: true,
      required: true,
    },
    contentEn: { type: String, required: true },
    contentAr: { type: String, required: true },
  },
  { timestamps: true }
);

export const AppSettingsModel = model<IAppSettings>('AppSettings', appSettingsSchema);

