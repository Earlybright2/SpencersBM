import nodemailer from 'nodemailer';
import { findByEmail, findById } from '../utils/store.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(email, resetLink) {
  const user = await findByEmail(email);
  if (!user) return;

  if (getTransporter()) {
    await getTransporter().sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Reset your SpencersBM password',
      html: `
        <div style="font-family:Poppins,Arial,sans-serif;background:#0a0a0a;color:#fff;padding:40px 20px;">
          <h1 style="color:#D4AF37;">SpencersBM</h1>
          <p>Hi ${user.name || 'there'},</p>
          <p>We received a request to reset your password. Click the button below to choose a new one:</p>
          <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#c99c2c);color:#0a0a0a;padding:14px 30px;border-radius:50px;font-weight:600;text-decoration:none;margin:20px 0;">
            Reset Password
          </a>
          <p style="color:#a0a0a0;font-size:13px;">This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
          <p style="color:#707070;font-size:12px;">Link: <a href="${resetLink}" style="color:#D4AF37;">${resetLink}</a></p>
        </div>
      `
    });
  } else {
    console.log('\n============================================');
    console.log('DEV MODE — Reset link for', email);
    console.log(resetLink);
    console.log('============================================\n');
  }
}

export async function resetUserPassword(userId, newPasswordHash) {
  const user = await findById(userId);
  if (!user) return null;
  user.password = newPasswordHash;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  return user;
}