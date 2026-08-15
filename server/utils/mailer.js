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

const fmtNgn = (n) => `\u20A6${Number(n || 0).toLocaleString()}`;

const EMAIL_FROM = () => `SpencersBM <${process.env.SMTP_USER || 'spencersbm1@hotmail.com'}>`;

function emailShell(title, badge, badgeColor, contentHtml) {
  return `
    <div style="font-family:Poppins,Arial,sans-serif;background:#0a0a0a;color:#fff;padding:40px 20px;">
      <div style="max-width:560px;margin:0 auto;background:#141414;border:1px solid rgba(212,175,55,0.25);border-radius:16px;overflow:hidden;">
        <div style="padding:28px 32px;border-bottom:1px solid rgba(212,175,55,0.15);">
          <div style="font-size:26px;font-weight:700;color:#D4AF37;letter-spacing:-1px;">SpencersBM</div>
        </div>
        <div style="padding:32px;">
          <div style="display:inline-block;padding:6px 16px;border-radius:50px;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#0a0a0a;background:${badgeColor};margin-bottom:20px;">${badge}</div>
          <h1 style="font-size:22px;margin:0 0 12px;">${title}</h1>
          ${contentHtml}
        </div>
        <div style="padding:20px 32px;border-top:1px solid rgba(212,175,55,0.15);color:#707070;font-size:12px;">
          Need help? Reply to this email or reach us 24/7 on WhatsApp &amp; Telegram.
        </div>
      </div>
    </div>
  `;
}

function orderRows(order) {
  const rows = [];
  const add = (label, value, mono) =>
    rows.push(`
      <tr>
        <td style="padding:8px 0;color:#a0a0a0;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.06);">${label}</td>
        <td style="padding:8px 0;font-size:13px;text-align:right;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06);${mono ? 'font-family:monospace;' : ''}">${value}</td>
      </tr>
    `);
  if (order.type === 'social_account') {
    add('Platform', order.platform || '—');
    add('Username / Email', order.username || '—', true);
    add('Password', order.password || '—', true);
  } else {
    add('Service', order.service || '—');
    add('Country', order.country || '—');
    add('Number', order.number || '—', true);
  }
  add('Order Reference', order.order_ref || '—', true);
  add('Amount Paid', fmtNgn(order.price));
  add('Status', order.status || '—');
  return rows.join('');
}

export async function sendWelcomeEmail(user) {
  const content = `
    <p style="color:#cfcfcf;font-size:14px;line-height:1.6;">Hi ${user.name || 'there'},</p>
    <p style="color:#cfcfcf;font-size:14px;line-height:1.6;">Welcome to <strong style="color:#D4AF37;">SpencersBM</strong>! Your account has been created successfully.</p>
    <p style="color:#cfcfcf;font-size:14px;line-height:1.6;">You can now fund your wallet and buy virtual numbers and premium social media accounts with instant delivery.</p>
    <p style="color:#a0a0a0;font-size:13px;">If you have any issues or questions, reach out to us 24/7 and we will be happy to help.</p>
  `;
  const subject = `Welcome to SpencersBM, ${user.name || ''}`.trim();
  if (!getTransporter()) {
    console.log('\n============================================');
    console.log('DEV MODE — Welcome email for', user.email);
    console.log('============================================\n');
    return;
  }
  await getTransporter().sendMail({
    from: EMAIL_FROM(),
    to: user.email,
    subject,
    html: emailShell('Welcome to SpencersBM', 'Welcome', '#D4AF37', content)
  });
}

export async function sendPurchaseSuccessEmail(user, order) {
  const product = order.type === 'social_account' ? order.platform : `${order.service} · ${order.country}`;
  const content = `
    <p style="color:#cfcfcf;font-size:14px;line-height:1.6;">Hi ${user.name || 'there'},</p>
    <p style="color:#cfcfcf;font-size:14px;line-height:1.6;">Your payment for <strong style="color:#D4AF37;">${product}</strong> was successful. Here are your purchase details:</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      ${orderRows(order)}
    </table>
    <p style="color:#a0a0a0;font-size:13px;">Keep these details safe. For social accounts, save the username and password somewhere secure.</p>
  `;
  const subject = `Payment Successful — ${product}`;
  if (!getTransporter()) {
    console.log('\n============================================');
    console.log('DEV MODE — Purchase success email for', user.email);
    console.log(JSON.stringify({ subject, order }, null, 2));
    console.log('============================================\n');
    return;
  }
  await getTransporter().sendMail({
    from: EMAIL_FROM(),
    to: user.email,
    subject,
    html: emailShell('Payment Successful', 'Payment Successful', '#2ecc71', content)
  });
}

export async function sendPurchaseFailureEmail(user, order, reason) {
  const product = order?.type === 'social_account'
    ? order.platform
    : `${order?.service || 'item'} ${order?.country ? `· ${order.country}` : ''}`;
  const content = `
    <p style="color:#cfcfcf;font-size:14px;line-height:1.6;">Hi ${user.name || 'there'},</p>
    <p style="color:#cfcfcf;font-size:14px;line-height:1.6;">We could not complete your purchase of <strong style="color:#D4AF37;">${product}</strong>. Your payment was <strong style="color:#ff8a80;">not successful</strong>, and no amount was charged.</p>
    <div style="background:rgba(224,100,90,0.1);border:1px solid rgba(224,100,90,0.35);color:#ff8a80;border-radius:10px;padding:14px 16px;font-size:13px;margin:20px 0;">
      <strong>Reason:</strong> ${reason || 'Something went wrong. Please try again.'}
    </div>
    ${order ? `<table style="width:100%;border-collapse:collapse;margin:20px 0;">${orderRows(order)}</table>` : ''}
    <p style="color:#a0a0a0;font-size:13px;">Make sure your wallet has enough balance, then try the purchase again. Your wallet was not debited.</p>
  `;
  const subject = `Payment Failed — ${product || 'Purchase'}`;
  if (!getTransporter()) {
    console.log('\n============================================');
    console.log('DEV MODE — Purchase failure email for', user.email);
    console.log(JSON.stringify({ subject, reason, order }, null, 2));
    console.log('============================================\n');
    return;
  }
  await getTransporter().sendMail({
    from: EMAIL_FROM(),
    to: user.email,
    subject,
    html: emailShell('Payment Failed', 'Payment Failed', '#e0645a', content)
  });
}