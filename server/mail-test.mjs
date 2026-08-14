import 'dotenv/config';
import nodemailer from 'nodemailer';
import { sendPurchaseSuccessEmail, sendPurchaseFailureEmail } from './utils/mailer.js';

const user = { name: 'Emily', email: 'emily223463@gmail.com' };

async function tryBoth() {
  try {
    await sendPurchaseSuccessEmail(user, {
      type: 'social_account',
      platform: 'Instagram',
      username: 'iguser_test',
      password: 'Pass123!',
      price: 15000,
      order_ref: 'TEST-ACCT-001',
      status: 'completed'
    });
    console.log('SUCCESS EMAIL SENT');
  } catch (e) { console.error('success send failed:', e.code || e.message); }
  try {
    await sendPurchaseFailureEmail(user, {
      type: 'virtual_number',
      service: 'WhatsApp',
      country: 'United States',
      price: 2500,
      order_ref: 'TEST-NUM-001',
      status: 'pending'
    }, 'Insufficient wallet balance.');
    console.log('FAILURE EMAIL SENT');
  } catch (e) { console.error('failure send failed:', e.code || e.message); }
}
await tryBoth();
