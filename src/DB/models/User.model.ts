import { Schema, model, Document, Types } from 'mongoose';

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  BUSINESS = 'BUSINESS',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
}

export enum BusinessStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface IBusinessLocation {
  label: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role: UserRole;
  gender?: Gender;
  city?: string;
  address?: string;
  language: string;
  topics: string[];
  points: number;
  scansCount: number;
  isEmailVerified: boolean;
  otpCode?: string;
  otpExpires?: Date;
  fcmTokens: string[];
  notificationPrefs: {
    general: boolean;
    sound: boolean;
    vibrate: boolean;
  };
  avatar?: { secure_url: string; public_id: string };
  authProvider: 'LOCAL' | 'GOOGLE' | 'FACEBOOK';
  savedOffers: Types.ObjectId[];
  // Business-specific fields
  businessCategory?: Types.ObjectId;
  businessSubCategory?: Types.ObjectId;
  businessLogo?: { secure_url: string; public_id: string };
  businessCover?: { secure_url: string; public_id: string };
  businessDescription?: string;
  businessAddresses: string[];
  businessLocations: IBusinessLocation[];
  businessStatus: BusinessStatus;
  loves: Types.ObjectId[];
  acceptedTerms: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, select: false },
    phone: { type: String, trim: true },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.CUSTOMER, index: true },
    gender: { type: String, enum: Object.values(Gender) },
    city: { type: String, trim: true, index: true },
    address: { type: String, trim: true },
    language: { type: String, default: 'English (US)' },
    topics: [{ type: String }],
    points: { type: Number, default: 100 },
    scansCount: { type: Number, default: 0 },
    isEmailVerified: { type: Boolean, default: false },
    otpCode: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    fcmTokens: [{ type: String }],
    notificationPrefs: {
      general: { type: Boolean, default: true },
      sound: { type: Boolean, default: true },
      vibrate: { type: Boolean, default: true },
    },
    avatar: {
      secure_url: String,
      public_id: String,
    },
    authProvider: {
      type: String,
      enum: ['LOCAL', 'GOOGLE', 'FACEBOOK'],
      default: 'LOCAL',
    },
    savedOffers: [{ type: Schema.Types.ObjectId, ref: 'Offer' }],
    businessCategory: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
    businessSubCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory', index: true },
    businessLogo: {
      secure_url: String,
      public_id: String,
    },
    businessCover: {
      secure_url: String,
      public_id: String,
    },
    businessDescription: { type: String },
    businessAddresses: [{ type: String }],
    businessLocations: [
      {
        label: { type: String },
        coordinates: { type: [Number] },
      },
    ],
    businessStatus: {
      type: String,
      enum: Object.values(BusinessStatus),
      default: BusinessStatus.PENDING,
      index: true,
    },
    loves: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    acceptedTerms: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index({ 'businessLocations.coordinates': '2dsphere' });

export const UserModel = model<IUser>('User', userSchema);
