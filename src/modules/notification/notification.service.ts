import { Response } from 'express';
import { NotificationModel } from '../../DB/models/Notification.model';
import { UserModel, UserRole } from '../../DB/models/User.model';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError, asyncHandler } from '../../utils/AppError';
import { sendPushNotification } from '../../utils/fcm.util';
import { sendEmail } from '../../utils/email.util';

export const getMyNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  const segmentRole = req.user.role === UserRole.BUSINESS ? 'BUSINESSES' : 'CUSTOMERS';
  const query = {
    $or: [{ recipientId: req.user._id }, { segment: 'ALL' }, { segment: segmentRole }],
  };

  const [notifications, unreadCount] = await Promise.all([
    NotificationModel.find(query)
      .populate('senderId', 'name businessLogo')
      .sort({ createdAt: -1 })
      .limit(50),
    NotificationModel.countDocuments({
      ...query,
      isRead: false,
    }),
  ]);

  res.status(200).json({ success: true, data: { notifications, unreadCount } });
});

export const markNotificationRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  await NotificationModel.findOneAndUpdate(
    { _id: req.params.id, $or: [{ recipientId: req.user._id }, { recipientId: { $exists: false } }] },
    { isRead: true }
  );
  res.status(200).json({ success: true, message: 'Notification marked as read' });
});

export const markAllNotificationsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const segmentRole = req.user.role === UserRole.BUSINESS ? 'BUSINESSES' : 'CUSTOMERS';
  await NotificationModel.updateMany(
    {
      $or: [{ recipientId: req.user._id }, { segment: 'ALL' }, { segment: segmentRole }],
      isRead: false,
    },
    { isRead: true }
  );

  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

export const adminBroadcastNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  const { title, body, segment = 'ALL', sendEmailCopy = false } = req.body;

  const notification = await NotificationModel.create({
    senderId: req.user._id,
    segment,
    title,
    body,
  });

  const userFilter: Record<string, any> = {};
  if (segment === 'CUSTOMERS') userFilter.role = UserRole.CUSTOMER;
  if (segment === 'BUSINESSES') userFilter.role = UserRole.BUSINESS;

  const recipients = await UserModel.find(userFilter).select('email fcmTokens notificationPrefs');
  const tokens = recipients
    .filter((u) => u.notificationPrefs?.general !== false)
    .flatMap((u) => u.fcmTokens);

  await sendPushNotification(tokens, title, body);

  if (sendEmailCopy) {
    await Promise.allSettled(
      recipients.map((u) => sendEmail(u.email, title, `<p>${body}</p>`))
    );
  }

  res.status(201).json({
    success: true,
    message: `Notification dispatched to ${segment}`,
    data: notification,
  });
});
