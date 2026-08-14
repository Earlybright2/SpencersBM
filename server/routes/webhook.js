import { Router } from 'express';
import { verifyWebhookSignature } from '../utils/flutterwave.js';
import { markFundSucceeded, findPendingFund, creditUserWallet } from '../utils/store.js';

const router = Router();

// POST /api/webhook/flutterwave
// Receives payment status updates from Flutterwave. The raw body is verified
// with HMAC-SHA256 using the merchant secret hash before any wallet is credited.
router.post('/flutterwave', async (req, res, next) => {
  try {
    const signature =
      req.headers['verif-hash'] || req.headers['flutterwave-signature'] || req.headers['signature'] || '';
    const rawBody = req.rawBody;
    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const payload = req.body || {};
    const event = payload.type || payload.event || payload.kind || '';
    const data = payload.data || payload.base_webhook_payload?.data || {};
    console.log('[flutterwave-webhook]', event, data.reference, data.status);

    // Card / OPay / dynamic PWBT charges: the reference matches a pending fund.
    if (event === 'charge.completed' && String(data.status) === 'succeeded' && data.reference) {
      const found = await findPendingFund(data.reference);
      if (found) {
        await markFundSucceeded({
          reference: data.reference,
          chargeId: data.id || data.charge_id || null,
          amount: data.amount || data.charged_amount || 0,
          currency: data.currency,
          meta: data
        });
        return res.status(200).json({ received: true });
      }

      // Bank-transfer (static virtual account) credit: the charge reference is
      // the virtual account's reference, so match the owning user directly.
      await creditStaticVirtualAccount(data, event);
    }

    // Alternate event name used for virtual-account funding.
    if ((event === 'virtual_account.funded' || event === 'virtual_account.credited') && data) {
      await creditStaticVirtualAccount(data, event);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[flutterwave-webhook]', err);
    next(err);
  }
});

async function creditStaticVirtualAccount(data, event) {
  const reference =
    data.reference || data.order_ref || data.tx_ref || data.virtual_account_id || null;
  const accountNumber = data.account_number || data.nuban || null;
  const amount = data.amount || data.charged_amount || 0;
  const currency = data.currency || 'NGN';
  if (!amount) return;

  const db = await (await import('../utils/store.js')).getUsers();
  let owner = null;

  // Match by stored virtual-account reference first.
  if (reference) {
    owner = db.users.find((u) => u.wallet?.virtualAccount?.reference === reference) || null;
  }
  // Fall back to the account number, then the customer email.
  if (!owner && accountNumber) {
    owner =
      db.users.find((u) => u.wallet?.virtualAccount?.account_number === accountNumber) || null;
  }
  if (!owner) {
    const email = data.customer?.email || data.customer_email || null;
    if (email) owner = db.users.find((u) => u.email === email.toLowerCase()) || null;
  }
  if (!owner) {
    console.warn('[flutterwave-webhook] No user matched for bank transfer', reference, accountNumber);
    return;
  }

  const idemRef = `VA-${reference || accountNumber || data.id || event}-${data.id || ''}`;
  await creditUserWallet(owner.id, {
    amount,
    currency,
    reference: idemRef,
    chargeId: data.id || data.charge_id || null,
    meta: { ...data, via: 'virtual_account', event }
  });
  console.log('[flutterwave-webhook] credited wallet via bank transfer', owner.email, amount, currency);
}

export default router;