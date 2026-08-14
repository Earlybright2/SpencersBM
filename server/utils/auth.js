import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'spencersbm-dev-secret-change-me';
const JWT_EXPIRES_IN = '7d';

export function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Checks the token is valid AND the account is an admin. Re-reads the user from
// the store so a role change (or user deletion) takes effect immediately.
export async function requireAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const { findById } = await import('./store.js');
      const user = await findById(req.user.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      req.user = { ...req.user, role: 'admin', name: user.name, email: user.email };
      next();
    } catch (err) {
      next(err);
    }
  });
}