import { Schema, model, Document, Types } from 'mongoose';

export enum OrderStatus {
  CLAIMED = 'CLAIMED',
  REDEEMED = 'REDEEMED',
  CANCELLED = 'CANCELLED',
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  customerId: Types.ObjectId;
  businessId: Types.ObjectId;
  offerId: Types.ObjectId;
  status: OrderStatus;
  pointsAwarded: number;
  pricePaid: number;
  qrToken: string;
  scannedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    offerId: { type: Schema.Types.ObjectId, ref: 'Offer', required: true },
    status: { type: String, enum: Object.values(OrderStatus), default: OrderStatus.CLAIMED },
    pointsAwarded: { type: Number, default: 0 },
    pricePaid: { type: Number, required: true },
    qrToken: { type: String, required: true, unique: true, index: true },
    scannedAt: { type: Date },
  },
  { timestamps: true }
);

export const OrderModel = model<IOrder>('Order', orderSchema);

