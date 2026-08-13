import { Router } from 'express';
import { requireAuth } from '../utils/auth.js';
import {
  getUserWallet,
  setPendingFund,
  findPendingFund,
  markFundSucceeded
} from '../utils/store.js';
import {
  isFlwConfigured,
  generateReference,
  initiateCharge,
  updateCharge,
  getCharge,
  encryptCard,
  encryptPin,
  buildCustomer,
  flwOk
} from '../utils/flutterwave.js';

const router = Router();

router.use(requireAuth);

// GET /api/wallet — current user's wallet balance + transactions
router.get('/', async (req, res, next) => {
  try {
    const wallet = await getUserWallet(req.user.id);
    res.json(wallet);
  } catch (err) {
    next(err);
  }
});

// GET /api/wallet/fund-status?reference= — polled by the client after a redirect
router.get('/fund-status', async (req, res, next) => {
  try {
    const { reference } = req.query;
    if (!reference) return res.status(400).json({ message: 'reference is required' });
    const found = await findPendingFund(reference);
    if (!found) return res.status(404).json({ message: 'Fund reference not found' });
    if (found.fund.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not your fund reference' });
    }
    res.json({
      reference,
      status: found.fund.status,
      amount: found.fund.amount,
      currency: found.fund.currency,
      method: found.fund.method,
      createdAt: found.fund.createdAt,
      completedAt: found.fund.completedAt || null
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/wallet/fund  { currency, amount, method: 'opay'|'card', phone?, card? }
router.post('/fund', async (req, res, next) => {
  try {
    if (!isFlwConfigured()) {
      return res.status(503).json({ message: 'Payments are not configured yet. Please try again later.' });
    }
    const { currency, amount, method, phone, card } = req.body || {};
    if (!currency || amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ message: 'currency and amount are required' });
    }
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }
    if (currency !== 'NGN' && currency !== 'USD') {
      return res.status(400).json({ message: 'Currency must be NGN or USD' });
    }
    if (method !== 'opay' && method !== 'card') {
      return res.status(400).json({ message: 'Payment method must be opay or card' });
    }

    const reference = generateReference();
    const redirectBase = process.env.FLW_REDIRECT_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    const redirectUrl = `${redirectBase}/dashboard?tab=overview&fund=${reference}`;
    const customer = buildCustomer({ name: req.user.name, email: req.user.email, phone });

    let paymentMethod;
    if (method === 'opay') {
      if (currency !== 'NGN') {
        return res.status(400).json({ message: 'OPay is only available for NGN payments' });
      }
      paymentMethod = { type: 'opay' };
    } else {
      if (!card?.card_number || !card?.expiry_month || !card?.expiry_year || !card?.cvv) {
        return res.status(400).json({ message: 'Card details are incomplete' });
      }
      paymentMethod = { type: 'card', card: encryptCard(card) };
    }

    const charge = await initiateCharge({
      amount: numAmount,
      currency,
      reference,
      customer,
      paymentMethod,
      redirectUrl
    });

    if (!flwOk(charge)) {
      return res.status(charge?.statusCode >= 500 ? 502 : 400).json({
        message: charge?.message || charge?.error?.message || 'Could not initiate payment',
        statusCode: charge?.statusCode,
        details: charge?.error || null
      });
    }

    await setPendingFund(req.user.id, reference, {
      reference,
      amount: numAmount,
      currency,
      method,
      chargeId: charge.data?.id || null,
      status: 'initiated',
      redirectUrl
    });

    if (String(charge.data?.status) === 'succeeded') {
      await markFundSucceeded({
        reference,
        chargeId: charge.data.id,
        amount: numAmount,
        currency,
        meta: charge.data
      });
    }

    res.json({ reference, charge: charge.data });
  } catch (err) {
    next(err);
  }
});

// POST /api/wallet/authorize  { chargeId, type: 'pin'|'otp'|'avs'|'external_3ds', value?, fields? }
router.post('/authorize', async (req, res, next) => {
  try {
    const { chargeId, type, value, fields } = req.body || {};
    if (!chargeId) return res.status(400).json({ message: 'chargeId is required' });

    let authorization;
    if (type === 'pin') {
      if (!value) return res.status(400).json({ message: 'PIN is required' });
      authorization = { type: 'pin', pin: encryptPin(value) };
    } else if (type === 'otp') {
      if (!value) return res.status(400).json({ message: 'OTP is required' });
      authorization = { type: 'otp', otp: String(value) };
    } else if (type === 'avs') {
      authorization = { type: 'avs', avs: fields || {} };
    } else if (type === 'external_3ds') {
      authorization = { type: 'external_3ds' };
    } else {
      return res.status(400).json({ message: 'Unsupported authorization type' });
    }

    const result = await updateCharge(chargeId, authorization);
    if (!flwOk(result)) {
      return res.status(result?.statusCode >= 500 ? 502 : 400).json({
        message: result?.message || 'Authorization failed',
        statusCode: result?.statusCode
      });
    }
    res.json({ status: 'success', charge: result.data });
  } catch (err) {
    next(err);
  }
});

// GET /api/wallet/charge-status?charge_id= — fallback to the Flutterwave verify endpoint
router.get('/charge-status', async (req, res, next) => {
  try {
    const { charge_id: chargeId } = req.query;
    if (!chargeId) return res.status(400).json({ message: 'charge_id is required' });
    const result = await getCharge(chargeId);
    if (!flwOk(result)) {
      return res.status(result?.statusCode >= 500 ? 502 : 400).json({
        message: result?.message || 'Could not retrieve charge',
        statusCode: result?.statusCode
      });
    }
    if (String(result.data?.status) === 'succeeded' && result.data?.reference) {
      await markFundSucceeded({
        reference: result.data.reference,
        chargeId: result.data.id || chargeId,
        amount: result.data.amount || 0,
        currency: result.data.currency,
        meta: result.data
      });
    }
    res.json(result.data);
  } catch (err) {
    next(err);
  }
});

export default router;