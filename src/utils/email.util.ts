import nodemailer from 'nodemailer';

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log(`[Email Service Notice] SMTP not configured. Mock Email sent to: ${to} | Subject: "${subject}"`);
    return;
  }

  try {
    const port = Number(process.env.SMTP_PORT) || 465;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // true for port 465 (SSL), false for 587 (TLS/STARTTLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
      from: `"Moujood App" <${fromAddress}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Failed to send email:', err);
  }
};
