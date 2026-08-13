import { pool } from './db.js';

let schemaReady = null;

export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        orders JSONB NOT NULL DEFAULT '[]'::jsonb,
        wallet JSONB NOT NULL DEFAULT '{"balance":0,"currency":"NGN","transactions":[],"pendingFunds":{}}'::jsonb,
        reset_token TEXT,
        reset_token_expiry TEXT,
        created_at TEXT NOT NULL
      )
    `);
  }
  return schemaReady;
}

function defaultWallet() {
  return { balance: 0, currency: 'NGN', transactions: [], pendingFunds: {} };
}

function userFromRow(row) {
  if (!row) return null;
  const user = {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    orders: Array.isArray(row.orders) ? row.orders : [],
    wallet: row.wallet || defaultWallet(),
    createdAt: row.created_at
  };
  if (row.reset_token) user.resetToken = row.reset_token;
  if (row.reset_token_expiry) user.resetTokenExpiry = row.reset_token_expiry;
  return user;
}

function paramsFromUser(u) {
  return [
    u.id,
    u.name,
    u.email,
    u.password,
    JSON.stringify(u.orders || []),
    JSON.stringify(u.wallet || defaultWallet()),
    u.resetToken || null,
    u.resetTokenExpiry || null,
    u.createdAt || new Date().toISOString()
  ];
}

const UPSERT_SQL = `
  INSERT INTO users (id, name, email, password, orders, wallet, reset_token, reset_token_expiry, created_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    orders = EXCLUDED.orders,
    wallet = EXCLUDED.wallet,
    reset_token = EXCLUDED.reset_token,
    reset_token_expiry = EXCLUDED.reset_token_expiry,
    created_at = EXCLUDED.created_at
`;

export async function getUsers() {
  await ensureSchema();
  const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at');
  return { users: rows.map(userFromRow) };
}

export async function saveUsers(data) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const u of data.users || []) {
      await client.query(UPSERT_SQL, paramsFromUser(u));
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function findByEmail(email) {
  await ensureSchema();
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
  return userFromRow(rows[0]);
}

export async function findById(id) {
  await ensureSchema();
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
  return userFromRow(rows[0]);
}

export async function createUser(user) {
  await ensureSchema();
  await pool.query(UPSERT_SQL, paramsFromUser(user));
  return user;
}

export async function updateUser(id, updates) {
  const current = await findById(id);
  if (!current) return null;
  const merged = { ...current, ...updates };
  await pool.query(UPSERT_SQL, paramsFromUser(merged));
  return merged;
}

export async function getUserOrders(userId) {
  const user = await findById(userId);
  return user?.orders || [];
}

export async function addUserOrder(userId, order) {
  const user = await findById(userId);
  if (!user) return null;
  const orders = Array.isArray(user.orders) ? [...user.orders] : [];
  orders.unshift(order);
  await updateUser(userId, { orders: orders.slice(0, 500) });
  return order;
}

export async function updateUserOrder(userId, orderRef, updates) {
  const user = await findById(userId);
  if (!user || !Array.isArray(user.orders)) return null;
  const idx = user.orders.findIndex((o) => o.order_ref === orderRef || o.ref === orderRef);
  if (idx === -1) return null;
  user.orders[idx] = { ...user.orders[idx], ...updates };
  await updateUser(userId, { orders: user.orders });
  return user.orders[idx];
}

// ----- Per-user wallet (funded via Flutterwave) -----

function ensureWallet(user) {
  if (!user.wallet) user.wallet = defaultWallet();
  if (!Array.isArray(user.wallet.transactions)) user.wallet.transactions = [];
  if (!user.wallet.pendingFunds || typeof user.wallet.pendingFunds !== 'object') {
    user.wallet.pendingFunds = {};
  }
  return user.wallet;
}

export async function getUserWallet(userId) {
  const user = await findById(userId);
  if (!user) return null;
  const wallet = ensureWallet(user);
  return {
    balance: Number(wallet.balance) || 0,
    currency: wallet.currency,
    transactions: wallet.transactions
  };
}

export async function setPendingFund(userId, reference, fund) {
  const user = await findById(userId);
  if (!user) return null;
  const wallet = ensureWallet(user);
  wallet.pendingFunds[reference] = {
    ...fund,
    userId,
    createdAt: fund.createdAt || new Date().toISOString()
  };
  await updateUser(userId, { wallet });
  return wallet.pendingFunds[reference];
}

export async function findPendingFund(reference) {
  await ensureSchema();
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE wallet->'pendingFunds' ? $1 LIMIT 1`,
    [reference]
  );
  const user = userFromRow(rows[0]);
  if (!user) return null;
  const fund = user.wallet?.pendingFunds?.[reference];
  return fund ? { user, fund } : null;
}

export async function creditUserWallet(userId, { amount, currency, reference, chargeId, meta }) {
  const user = await findById(userId);
  if (!user) return null;
  const wallet = ensureWallet(user);
  if (wallet.transactions.some((t) => t.reference === reference)) {
    return { balance: wallet.balance, currency: wallet.currency, transactions: wallet.transactions };
  }
  wallet.balance = (Number(wallet.balance) || 0) + Number(amount);
  wallet.currency = currency;
  wallet.transactions.unshift({
    type: 'credit',
    amount: Number(amount),
    currency,
    reference,
    chargeId,
    status: 'completed',
    createdAt: new Date().toISOString(),
    meta
  });
  wallet.transactions = wallet.transactions.slice(0, 200);
  await updateUser(userId, { wallet });
  return { balance: wallet.balance, currency: wallet.currency, transactions: wallet.transactions };
}

export async function markFundSucceeded({ reference, chargeId, amount, currency, meta }) {
  const found = await findPendingFund(reference);
  if (!found) return false;
  const { user, fund } = found;
  if (fund.status === 'succeeded') return true;
  const wallet = ensureWallet(user);
  wallet.pendingFunds[reference] = {
    ...fund,
    status: 'succeeded',
    chargeId,
    completedAt: new Date().toISOString(),
    raw: meta
  };
  await updateUser(user.id, { wallet });
  await creditUserWallet(user.id, { amount, currency, reference, chargeId, meta });
  return true;
}