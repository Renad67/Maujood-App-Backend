import { Schema, model, Document, Types } from 'mongoose';

export interface IComment extends Document {
  _id: Types.ObjectId;
  offerId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    offerId: { type: Schema.Types.ObjectId, ref: 'Offer', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

export const CommentModel = model<IComment>('Comment', commentSchema);

