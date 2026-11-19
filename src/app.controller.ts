import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './DB/connection';
import { globalErrorHandler } from './middleware/error.middleware';
import { stripeWebhookHandler } from './modules/wallet/wallet.service';

import authRouter from './modules/auth/auth.controller';
import userRouter from './modules/user/user.controller';
import categoryRouter from './modules/category/category.controller';
import offerRouter from './modules/offer/offer.controller';
import businessRouter from './modules/business/business.controller';
import walletRouter from './modules/wallet/wallet.controller';
import notificationRouter from './modules/notification/notification.controller';
import adminRouter from './modules/admin/admin.controller';
import homeRouter from './modules/home/home.controller';
import supportRouter from './modules/support/support.controller';

export const bootstrap = async (app: Express): Promise<void> => {
  await connectDB();

  app.use(helmet());
  app.use(cors());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      message: { success: false, message: 'Too many requests, please try again later.' },
    })
  );

  // Raw body parser for cryptographic Stripe Webhook verification
  app.post(
    '/api/v1/wallet/webhook',
    express.raw({ type: 'application/json' }),
    stripeWebhookHandler
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Mount Modular Routers
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/categories', categoryRouter);
  app.use('/api/v1/offers', offerRouter);
  app.use('/api/v1/business', businessRouter);
  app.use('/api/v1/wallet', walletRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/home', homeRouter);
  app.use('/api/v1/support', supportRouter);

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', service: 'Moujood API v1.0', timestamp: new Date() });
  });

  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
  });

  app.use(globalErrorHandler);
};
