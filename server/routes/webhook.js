import { Router } from 'express';
import { verifyWebhookSignature } from '../utils/flutterwave.js';
import { markFundSucceeded } from '../utils/store.js';

const router = Router();

// POST /api/webhook/flutterwave
// Receives payment status updates from Flutterwave. The raw body is verified
// with HMAC-SHA256 using the merchant secret hash before any wallet is credited.
router.post('/flutterwave', async (req, res, next) => {
  try {
    const signature = req.headers['flutterwave-signature'] || req.headers['signature'] || '';
    const rawBody = req.rawBody;
    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const payload = req.body || {};
    const event = payload.type || payload.event || payload.kind || '';
    const data = payload.data || payload.base_webhook_payload?.data || {};
    console.log('[flutterwave-webhook]', event, data.reference, data.status);

    if (event === 'charge.completed' && String(data.status) === 'succeeded' && data.reference) {
      await markFundSucceeded({
        reference: data.reference,
        chargeId: data.id || data.charge_id || null,
        amount: data.amount || data.charged_amount || 0,
        currency: data.currency,
        meta: data
      });
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[flutterwave-webhook]', err);
    next(err);
  }
});

export default router;