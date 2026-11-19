import { Schema, model, Document, Types } from 'mongoose';

export interface IContactMessage extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: Date;
  updatedAt: Date;
}

const contactMessageSchema = new Schema<IContactMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN' },
  },
  { timestamps: true }
);

export const ContactMessageModel = model<IContactMessage>('ContactMessage', contactMessageSchema);

