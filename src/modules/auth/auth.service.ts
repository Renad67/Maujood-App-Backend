import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { UserModel, UserRole, BusinessStatus } from '../../DB/models/User.model';
import { WalletModel } from '../../DB/models/Wallet.model';
import { AppError, asyncHandler } from '../../utils/AppError';
import { uploadToCloud } from '../../utils/cloud.util';
import { sendEmail } from '../../utils/email.util';
import { AuthRequest } from '../../middleware/auth.middleware';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (id: string, role: string) => {
  const secret = process.env.JWT_SECRET || 'default_jwt_secret_dev';
  return jwt.sign({ id, role }, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
  });
};

export const registerCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, password, gender, city, phone } = req.body;
  if (await UserModel.findOne({ email: email.toLowerCase() })) {
    throw new AppError('Email already registered', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  const user = await UserModel.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    gender,
    city,
    phone,
    role: UserRole.CUSTOMER,
    otpCode,
    otpExpires: new Date(Date.now() + 10 * 60 * 1000),
  });

  await WalletModel.create({ userId: user._id, balance: 0, currency: 'EGP' });
  await sendEmail(
    email,
    'Verify your Moujood Account',
    `<p>Welcome to Moujood! Your OTP verification code is: <b>${otpCode}</b> (valid for 10 minutes).</p>`
  );

  const token = signToken(user._id.toString(), user.role);
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.otpCode;
  delete userObj.otpExpires;

  res.status(201).json({
    success: true,
    message: 'Customer registered successfully. Please verify your email with the OTP sent.',
    data: { user: userObj, token },
  });
});

export const registerBusiness = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    name,
    email,
    password,
    businessCategory,
    businessSubCategory,
    businessDescription,
    businessAddresses,
    businessLocations,
    businessPhone,
  } = req.body;

  if (await UserModel.findOne({ email: email.toLowerCase() })) {
    throw new AppError('Email already registered', 409);
  }

  // Handle uploaded files (single file or fields)
  let logoFile: Express.Multer.File | undefined;
  let coverFile: Express.Multer.File | undefined;

  if (req.files && !Array.isArray(req.files)) {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files['businessLogo'] && files['businessLogo'][0]) {
      logoFile = files['businessLogo'][0];
    }
    if (files['businessCover'] && files['businessCover'][0]) {
      coverFile = files['businessCover'][0];
    }
  } else if (req.file) {
    logoFile = req.file;
  }

  if (!logoFile) {
    throw new AppError('Business logo is required', 400);
  }

  const logo = await uploadToCloud(logoFile.buffer, 'businesses', 'image');
  const cover = coverFile ? await uploadToCloud(coverFile.buffer, 'businesses', 'image') : undefined;
  const hashedPassword = await bcrypt.hash(password, 12);

  let addresses: string[] = [];
  if (Array.isArray(businessAddresses)) {
    addresses = businessAddresses;
  } else if (typeof businessAddresses === 'string') {
    try {
      const parsed = JSON.parse(businessAddresses);
      addresses = Array.isArray(parsed) ? parsed : [businessAddresses];
    } catch {
      addresses = [businessAddresses];
    }
  }

  let locations: any[] = [];
  if (Array.isArray(businessLocations)) {
    locations = businessLocations;
  } else if (typeof businessLocations === 'string') {
    try {
      const parsed = JSON.parse(businessLocations);
      locations = Array.isArray(parsed) ? parsed : [];
    } catch {
      locations = [];
    }
  }

  const business = await UserModel.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    phone: businessPhone,
    role: UserRole.BUSINESS,
    businessCategory,
    businessSubCategory: businessSubCategory || undefined,
    businessLogo: logo,
    businessCover: cover,
    businessDescription,
    businessAddresses: addresses,
    businessLocations: locations,
    businessStatus: BusinessStatus.PENDING,
  });

  await WalletModel.create({ userId: business._id, balance: 0, currency: 'EGP' });
  await sendEmail(
    email,
    'Moujood Business Application Received',
    `<p>Hello ${name}, your business account application has been received and is pending Super Admin review.</p>`
  );

  const token = signToken(business._id.toString(), business.role);
  const businessObj = business.toObject();
  delete businessObj.password;

  res.status(201).json({
    success: true,
    message: 'Business registered and pending approval',
    data: { business: businessObj, token },
  });
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password, fcmToken } = req.body;
  const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (fcmToken && !user.fcmTokens.includes(fcmToken)) {
    user.fcmTokens.push(fcmToken);
    await user.save();
  }

  const token = signToken(user._id.toString(), user.role);
  res.status(200).json({
    success: true,
    data: {
      token,
      role: user.role,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        points: user.points,
        city: user.city,
        businessStatus: user.role === UserRole.BUSINESS ? user.businessStatus : undefined,
      },
    },
  });
});

export const googleSocialAuth = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { idToken, fcmToken } = req.body;
  if (!idToken) throw new AppError('Google ID token is required', 400);

  let payload: any;
  if (process.env.GOOGLE_CLIENT_ID) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } else {
    // In dev if GOOGLE_CLIENT_ID not configured, allow testing with mock decoded payload
    payload = {
      email: 'social_user@gmail.com',
      name: 'Google User',
      picture: 'https://placehold.co/200x200/008a3e/ffffff?text=Google',
    };
  }

  if (!payload?.email) throw new AppError('Invalid Google token', 401);

  let user = await UserModel.findOne({ email: payload.email.toLowerCase() });
  if (!user) {
    user = await UserModel.create({
      name: payload.name || 'Moujood User',
      email: payload.email.toLowerCase(),
      avatar: payload.picture ? { secure_url: payload.picture, public_id: '' } : undefined,
      role: UserRole.CUSTOMER,
      authProvider: 'GOOGLE',
      isEmailVerified: true,
    });
    await WalletModel.create({ userId: user._id, balance: 0, currency: 'EGP' });
  }

  if (fcmToken && !user.fcmTokens.includes(fcmToken)) {
    user.fcmTokens.push(fcmToken);
    await user.save();
  }

  const token = signToken(user._id.toString(), user.role);
  res.status(200).json({ success: true, data: { user, token } });
});

export const facebookSocialAuth = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { accessToken, fcmToken } = req.body;
  if (!accessToken) throw new AppError('Facebook access token is required', 400);

  let fbData: any;
  try {
    const fbRes = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
    );
    fbData = fbRes.data;
  } catch {
    if (!process.env.FACEBOOK_APP_ID) {
      // Mock for development testing
      fbData = {
        name: 'Facebook User',
        email: 'facebook_user@fb.com',
        picture: { data: { url: 'https://placehold.co/200x200/008a3e/ffffff?text=Facebook' } },
      };
    } else {
      throw new AppError('Failed to verify Facebook access token', 401);
    }
  }

  const { email, name, picture } = fbData;
  if (!email) throw new AppError('Facebook account must provide email permission', 400);

  let user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    user = await UserModel.create({
      name: name || 'Moujood User',
      email: email.toLowerCase(),
      avatar: picture?.data?.url ? { secure_url: picture.data.url, public_id: '' } : undefined,
      role: UserRole.CUSTOMER,
      authProvider: 'FACEBOOK',
      isEmailVerified: true,
    });
    await WalletModel.create({ userId: user._id, balance: 0, currency: 'EGP' });
  }

  if (fcmToken && !user.fcmTokens.includes(fcmToken)) {
    user.fcmTokens.push(fcmToken);
    await user.save();
  }

  const token = signToken(user._id.toString(), user.role);
  res.status(200).json({ success: true, data: { user, token } });
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { fcmToken } = req.body;
  if (req.user && fcmToken) {
    await UserModel.findByIdAndUpdate(req.user._id, { $pull: { fcmTokens: fcmToken } });
  }
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export const verifyEmailOtp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, otpCode } = req.body;
  const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+otpCode +otpExpires');

  if (!user || user.otpCode !== otpCode || !user.otpExpires || user.otpExpires < new Date()) {
    throw new AppError('Invalid or expired OTP code', 400);
  }

  user.isEmailVerified = true;
  user.otpCode = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.status(200).json({ success: true, message: 'Email verified successfully' });
});

export const forgotPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email } = req.body;
  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new AppError('No account found with that email address', 404);
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.otpCode = otpCode;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendEmail(
    email,
    'Moujood Password Reset Code',
    `<p>Your password reset OTP code is: <b>${otpCode}</b> (valid for 10 minutes).</p>`
  );

  res.status(200).json({ success: true, message: 'Password reset OTP sent to your email' });
});

export const resetPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, otpCode, newPassword } = req.body;
  const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+otpCode +otpExpires');

  if (!user || user.otpCode !== otpCode || !user.otpExpires || user.otpExpires < new Date()) {
    throw new AppError('Invalid or expired OTP code', 400);
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.otpCode = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.status(200).json({ success: true, message: 'Password reset successful. You may now log in.' });
});
