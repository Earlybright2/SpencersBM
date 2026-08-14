import { Router } from 'express';
import { requireAuth } from '../utils/auth.js';
import {
  getUserWallet,
  setPendingFund,
  findPendingFund,
  markFundSucceeded,
  creditUserWallet,
  findById,
  setVirtualAccount,
  updateUser
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
  createVirtualAccount,
  getOrCreateCustomer,
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

// POST /api/wallet/test-fund { amount } — Sandbox instant top-up for testing
router.post('/test-fund', async (req, res, next) => {
  try {
    const isSandbox = (process.env.FLW_BASE_URL || '').includes('sandbox') || process.env.NODE_ENV !== 'production';
    if (!isSandbox) {
      return res.status(403).json({ message: 'Test funding is only available in Sandbox / Development mode.' });
    }
    const { amount } = req.body || {};
    const numAmount = Number(amount) || 10000;
    if (numAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be positive.' });
    }
    const reference = generateReference();
    const result = await creditUserWallet(req.user.id, {
      amount: numAmount,
      currency: 'NGN',
      reference,
      chargeId: 'sandbox_test_charge',
      meta: { description: 'Sandbox test money top-up' }
    });
    res.json({
      message: `Successfully credited ₦${numAmount.toLocaleString()} test balance!`,
      wallet: result
    });
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

// POST /api/wallet/virtual-account { amount } — generates a fresh NGN
// bank-account number the user transfers `amount` to, then credits their wallet
// when Flutterwave confirms the transfer.
router.post('/virtual-account', async (req, res, next) => {
  try {
    if (!isFlwConfigured()) {
      return res.status(503).json({ message: 'Payments are not configured yet. Please try again later.' });
    }
    const { amount } = req.body || {};
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Please enter the amount you want to fund.' });
    }
    const user = await findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const reference = generateReference();

    // v4 virtual accounts reference a Flutterwave customer ID.
    let customerId = user.wallet?.flwCustomerId || null;
    if (!customerId) {
      const customerResult = await getOrCreateCustomer({ name: user.name, email: user.email });
      if (!customerResult.ok) {
        const bad = customerResult.response || {};
        return res.status(bad.statusCode >= 500 ? 502 : 400).json({
          message: bad.message || 'Could not create payment customer',
          statusCode: bad.statusCode,
          details: bad.error || null
        });
      }
      customerId = customerResult.customerId;
      await updateUser(user.id, { wallet: { ...user.wallet, flwCustomerId: customerId } });
    }

    const result = await createVirtualAccount({ reference, customerId, type: 'dynamic', amount: numAmount });
    if (!flwOk(result)) {
      return res.status(result?.statusCode >= 500 ? 502 : 400).json({
        message: result?.message || result?.error?.message || 'Could not generate a bank account number',
        statusCode: result?.statusCode,
        details: result?.error || null
      });
    }
    const va = {
      id: result.data?.id || null,
      reference,
      account_number: result.data?.account_number || result.data?.nuban || null,
      bank_name: result.data?.account_bank_name || result.data?.bank_name || null,
      account_name: result.data?.account_name || result.data?.note || null,
      amount: numAmount,
      status: result.data?.status || null,
      createdAt: new Date().toISOString()
    };
    await setVirtualAccount(user.id, va);
    await setPendingFund(user.id, reference, {
      reference,
      amount: numAmount,
      currency: 'NGN',
      method: 'bank',
      chargeId: result.data?.id || null,
      status: 'initiated'
    });
    res.json({ virtualAccount: va });
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
    const user = await findById(req.user.id);
    const customer = buildCustomer({ name: user?.name, email: user?.email || req.user.email, phone });

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