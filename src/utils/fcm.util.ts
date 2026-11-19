import admin from 'firebase-admin';

if (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY &&
  !admin.apps.length
) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } catch (err) {
    console.warn('Firebase Admin initialization skipped:', err);
  }
}

export const sendPushNotification = async (
  tokens: string[],
  title: string,
  body: string
): Promise<void> => {
  if (!admin.apps.length || !tokens.length) return;
  try {
    await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
    });
  } catch (err) {
    console.error('Failed to send push notification:', err);
  }
};

