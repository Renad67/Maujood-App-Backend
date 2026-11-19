import crypto from 'crypto';
import QRCode from 'qrcode';
import { AppError } from './AppError';

export const createSignedQrToken = (payload: Record<string, any>): string => {
  const secret = process.env.QR_HMAC_SECRET || 'fallback-secret';
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
};

export const verifySignedQrToken = <T>(token: string): T => {
  const secret = process.env.QR_HMAC_SECRET || 'fallback-secret';
  const [data, signature] = token.split('.');
  if (!data || !signature) {
    throw new AppError('Invalid QR token format', 400);
  }

  const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (signature !== expectedSig) {
    throw new AppError('Forged or invalid QR signature', 401);
  }

  return JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as T;
};

export const generateQrDataUrl = async (token: string): Promise<string> => {
  return QRCode.toDataURL(token);
};

