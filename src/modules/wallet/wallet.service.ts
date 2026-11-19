import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { WalletModel } from '../../DB/models/Wallet.model';
import {
  TransactionModel,
  TransactionType,
  TransactionStatus,
} from '../../DB/models/Transaction.model';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError, asyncHandler } from '../../utils/AppError';
import { stripe } from '../../utils/payment.util';

export const getMyWallet = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  let wallet = await WalletModel.findOne({ userId: req.user._id });
  if (!wallet) {
    wallet = await WalletModel.create({ userId: req.user._id, balance: 0, currency: 'EUR' });
  }

  const transactions = await TransactionModel.find({ walletId: wallet._id })
    .sort({ createdAt: -1 })
    .limit(25);

  res.status(200).json({
    success: true,
    data: { wallet, points: req.user.points, transactions },
  });
});

export const createTopUpCheckout = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  const { amount } = req.body;
  if (!amount || amount <= 0) {
    throw new AppError('Valid positive amount is required', 400);
  }

  let wallet = await WalletModel.findOne({ userId: req.user._id });
  if (!wallet) {
    wallet = await WalletModel.create({ userId: req.user._id, balance: 0, currency: 'EUR' });
  }

  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('placeholder')) {
    const mockSessionId = `cs_test_mock_${Date.now()}`;
    await TransactionModel.create({
      walletId: wallet._id,
      userId: req.user._id,
      type: TransactionType.TOP_UP,
      amount,
      status: TransactionStatus.PENDING,
      externalReference: mockSessionId,
      description: `Wallet top-up (Dev Mock) (${amount} ${wallet.currency})`,
    });

    return res.status(200).json({
      success: true,
      message: 'Development mock checkout session created. Set STRIPE_SECRET_KEY in .env for live Stripe payments.',
      data: {
        checkoutUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/wallet?status=success&session_id=${mockSessionId}`,
        sessionId: mockSessionId,
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: req.user.email,
    line_items: [
      {
        price_data: {
          currency: wallet.currency.toLowerCase(),
          product_data: { name: 'Moujood Wallet Top-Up' },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: req.user._id.toString(),
      walletId: wallet._id.toString(),
      amount: amount.toString(),
    },
    success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/wallet?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/wallet?status=cancelled`,
  });

  await TransactionModel.create({
    walletId: wallet._id,
    userId: req.user._id,
    type: TransactionType.TOP_UP,
    amount,
    status: TransactionStatus.PENDING,
    externalReference: session.id,
    description: `Wallet top-up via Stripe (${amount} ${wallet.currency})`,
  });

  res.status(200).json({
    success: true,
    data: { checkoutUrl: session.url, sessionId: session.id },
  });
});

export const stripeWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(400).json({ error: 'STRIPE_WEBHOOK_SECRET is not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const sessionObj = event.data.object as any;

    let dbSession: mongoose.ClientSession | null = null;
    let useTransaction = false;

    try {
      dbSession = await mongoose.startSession();
      dbSession.startTransaction();
      useTransaction = true;
    } catch {
      if (dbSession) {
        dbSession.endSession();
        dbSession = null;
      }
    }

    try {
      const txQuery = TransactionModel.findOne({
        externalReference: sessionObj.id,
        status: TransactionStatus.PENDING,
      });
      if (useTransaction && dbSession) txQuery.session(dbSession);
      const tx = await txQuery;

      if (tx) {
        tx.status = TransactionStatus.COMPLETED;
        if (useTransaction && dbSession) {
          await tx.save({ session: dbSession });
          await WalletModel.findByIdAndUpdate(
            tx.walletId,
            { $inc: { balance: tx.amount } },
            { session: dbSession }
          );
        } else {
          await tx.save();
          await WalletModel.findByIdAndUpdate(tx.walletId, { $inc: { balance: tx.amount } });
        }
      }

      if (useTransaction && dbSession) {
        await dbSession.commitTransaction();
      }
    } catch (err) {
      if (useTransaction && dbSession) {
        await dbSession.abortTransaction();
      }
      throw err;
    } finally {
      if (dbSession) {
        dbSession.endSession();
      }
    }
  }

  res.status(200).json({ received: true });
});

