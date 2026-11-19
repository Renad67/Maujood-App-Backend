import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const uri = process.env.DB_URI;
  if (!uri) {
    throw new Error('FATAL: DB_URI is not defined in environment variables.');
  }
  await mongoose.connect(uri);
  console.log('MongoDB Connected Successfully');
};

