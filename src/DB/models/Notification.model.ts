import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  _id: Types.ObjectId;
  senderId?: Types.ObjectId;
  recipientId?: Types.ObjectId; // Null if broadcast to segment
  segment?: 'ALL' | 'CUSTOMERS' | 'BUSINESSES';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    segment: { type: String, enum: ['ALL', 'CUSTOMERS', 'BUSINESSES'] },
    title: { type: String, required: true },
    body: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const NotificationModel = model<INotification>('Notification', notificationSchema);

