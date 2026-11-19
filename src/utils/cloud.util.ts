import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { AppError } from './AppError';

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Standard image upload (5MB)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Only image files are allowed', 400));
    }
  },
});

// Media upload for Images and Reels Videos (50MB)
export const uploadMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for Reels videos
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new AppError('Only image and video files are allowed', 400));
    }
  },
});

export const uploadToCloud = (
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'video' | 'auto' = 'auto'
): Promise<{ secure_url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      // In development when credentials are not yet set, provide a mock placeholder
      return resolve({
        secure_url: `https://placehold.co/600x400/008a3e/ffffff?text=${encodeURIComponent(folder)}`,
        public_id: `dev_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      });
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder: `moujood/${folder}`, resource_type: resourceType },
      (error, result) => {
        if (error || !result) return reject(new AppError('Cloud upload failed', 500));
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

export const deleteFromCloud = async (publicId?: string): Promise<void> => {
  if (publicId && !publicId.startsWith('dev_') && process.env.CLOUDINARY_CLOUD_NAME) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.warn('Failed to delete image/media from Cloudinary:', err);
    }
  }
};
