import { Schema, model, Document, Types } from 'mongoose';

export interface IWallet extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  balance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'EGP' },
  },
  { timestamps: true }
);

export const WalletModel = model<IWallet>('Wallet', walletSchema);

