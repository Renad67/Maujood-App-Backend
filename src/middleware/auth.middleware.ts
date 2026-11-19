import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel, IUser, UserRole } from '../DB/models/User.model';
import { AppError, asyncHandler } from '../utils/AppError';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticate = asyncHandler(
  async (req: AuthRequest, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please provide a valid Bearer token.', 401);
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('Server misconfiguration: JWT_SECRET not defined', 500);
    }

    let decoded: { id: string; role: string };
    try {
      decoded = jwt.verify(token, secret) as { id: string; role: string };
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Token has expired. Please log in again.', 401);
      }
      throw new AppError('Invalid authentication token.', 401);
    }

    const user = await UserModel.findById(decoded.id);
    if (!user) {
      throw new AppError('User associated with this token no longer exists.', 401);
    }

    req.user = user;
    next();
  }
);

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user || !roles.includes(authReq.user.role)) {
      throw new AppError('Forbidden: Insufficient role permissions.', 403);
    }
    next();
  };
};

