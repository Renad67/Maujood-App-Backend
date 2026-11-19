import { Schema, model, Document, Types } from 'mongoose';

export enum TransactionType {
  TOP_UP = 'TOP_UP',
  PAYMENT = 'PAYMENT',
  PAYOUT = 'PAYOUT',
  POINTS_REDEMPTION = 'POINTS_REDEMPTION',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ITransaction extends Document {
  _id: Types.ObjectId;
  walletId: Types.ObjectId;
  userId: Types.ObjectId;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  externalReference?: string; // Stripe Session / PaymentIntent ID
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: Object.values(TransactionType), required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: Object.values(TransactionStatus), default: TransactionStatus.PENDING },
    externalReference: { type: String, index: true },
    description: { type: String, required: true },
  },
  { timestamps: true }
);

export const TransactionModel = model<ITransaction>('Transaction', transactionSchema);

