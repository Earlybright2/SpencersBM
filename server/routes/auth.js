import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { signToken, requireAuth } from '../utils/auth.js';
import { findByEmail, findById, createUser, updateUser } from '../utils/store.js';
import { sendPasswordResetEmail, resetUserPassword, sendWelcomeEmail } from '../utils/mailer.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'user',
    createdAt: user.createdAt
  };
}

function randomId() {
  return crypto.randomUUID();
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (await findByEmail(normalizedEmail)) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    const user = {
      id: randomId(),
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      orders: [],
      wallet: { balance: 0, currency: 'NGN', transactions: [], pendingFunds: {} },
      createdAt: new Date().toISOString()
    };
    await createUser(user);
    const token = signToken(user);
    // Fire-and-forget welcome email so a slow SMTP never blocks registration.
    sendWelcomeEmail(user).catch((err) => console.error('Welcome email failed:', err.message));
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await findByEmail(email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ message: 'Account not found for this email address' });
    }
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Incorrect password' });
    }
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — returns the current user from a valid token
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-password — requires the user to be logged in
router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }
    const user = await findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await updateUser(user.id, { password: user.password });
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password — sends a reset link to the email
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    const user = await findByEmail(email.trim().toLowerCase());
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      await updateUser(user.id, { resetToken, resetTokenExpiry });
      const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      await sendPasswordResetEmail(user.email, resetLink);
    }
    // Always respond the same to avoid leaking which emails exist
    res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password — uses the token from the email
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }
    const db = await (await import('../utils/store.js')).getUsers();
    const user = db.users.find(
      (u) => u.resetToken === token && new Date(u.resetTokenExpiry) > new Date()
    );
    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired' });
    }
    const { updateUser } = await import('../utils/store.js');
    await updateUser(user.id, {
      password: await bcrypt.hash(newPassword, 10),
      resetToken: null,
      resetTokenExpiry: null
    });
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
});

export default router;