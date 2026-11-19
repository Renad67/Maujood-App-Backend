import { Request, Response, NextFunction, RequestHandler } from 'express';

export class AppError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const asyncHandler = <T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req as T, res, next).catch(next);
  };
};

