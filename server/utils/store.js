import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import { getUsdToNgnRate } from './rates.js';

// Helper to transform a PostgreSQL user row into the standard JavaScript user object shape
function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role || 'user',
    orders: row.orders || [],
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    wallet: {
      balance: Number(row.wallet_balance) || 0,
      currency: row.wallet_currency || 'NGN',
      flwCustomerId: row.flw_customer_id || null,
      transactions: row.transactions || [],
      pendingFunds: row.pending_funds || {},
      virtualAccount: row.virtual_account || null
    }
  };
}

// ----- Users -----

export async function getUsers() {
  const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
  return { users: rows.map(mapUserRow) };
}

export async function findByEmail(email) {
  if (!email) return null;
  const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
  return mapUserRow(rows[0]);
}

export async function findById(id) {
  if (!id) return null;
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return mapUserRow(rows[0]);
}

export async function createUser(user) {
  const wallet = user.wallet || {};
  const { rows } = await pool.query(
    `INSERT INTO users (id, name, email, password, role, wallet_balance, wallet_currency, flw_customer_id, orders, transactions, pending_funds, virtual_account, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      user.id,
      user.name,
      user.email.trim().toLowerCase(),
      user.password,
      user.role || 'user',
      Number(wallet.balance) || 0,
      wallet.currency || 'NGN',
      wallet.flwCustomerId || null,
      JSON.stringify(user.orders || []),
      JSON.stringify(wallet.transactions || []),
      JSON.stringify(wallet.pendingFunds || {}),
      wallet.virtualAccount ? JSON.stringify(wallet.virtualAccount) : null,
      user.createdAt || new Date().toISOString()
    ]
  );
  return mapUserRow(rows[0]);
}

export async function updateUser(id, updates) {
  const existing = await findById(id);
  if (!existing) return null;

  const name = updates.name !== undefined ? updates.name : existing.name;
  const email = updates.email !== undefined ? updates.email.trim().toLowerCase() : existing.email;
  const password = updates.password !== undefined ? updates.password : existing.password;
  const role = updates.role !== undefined ? updates.role : existing.role;

  const walletUpdates = updates.wallet || {};
  const walletBalance = walletUpdates.balance !== undefined ? Number(walletUpdates.balance) : existing.wallet.balance;
  const walletCurrency = walletUpdates.currency !== undefined ? walletUpdates.currency : existing.wallet.currency;
  const flwCustomerId = walletUpdates.flwCustomerId !== undefined ? walletUpdates.flwCustomerId : existing.wallet.flwCustomerId;
  const transactions = walletUpdates.transactions !== undefined ? walletUpdates.transactions : existing.wallet.transactions;
  const pendingFunds = walletUpdates.pendingFunds !== undefined ? walletUpdates.pendingFunds : existing.wallet.pendingFunds;
  const virtualAccount = walletUpdates.virtualAccount !== undefined ? walletUpdates.virtualAccount : existing.wallet.virtualAccount;

  const orders = updates.orders !== undefined ? updates.orders : existing.orders;

  const { rows } = await pool.query(
    `UPDATE users
     SET name = $1, email = $2, password = $3, role = $4,
         wallet_balance = $5, wallet_currency = $6, flw_customer_id = $7,
         orders = $8, transactions = $9, pending_funds = $10, virtual_account = $11
     WHERE id = $12
     RETURNING *`,
    [
      name,
      email,
      password,
      role,
      walletBalance,
      walletCurrency,
      flwCustomerId,
      JSON.stringify(orders),
      JSON.stringify(transactions),
      JSON.stringify(pendingFunds),
      virtualAccount ? JSON.stringify(virtualAccount) : null,
      id
    ]
  );
  return mapUserRow(rows[0]);
}

export async function countUsers() {
  const { rows } = await pool.query('SELECT COUNT(*) FROM users');
  return parseInt(rows[0].count, 10);
}

export async function getUserOrders(userId) {
  const user = await findById(userId);
  return user?.orders || [];
}

export async function addUserOrder(userId, order) {
  const user = await findById(userId);
  if (!user) return null;
  const orders = [order, ...(user.orders || [])].slice(0, 500);
  await pool.query('UPDATE users SET orders = $1 WHERE id = $2', [JSON.stringify(orders), userId]);
  return order;
}

export async function updateUserOrder(userId, orderRef, updates) {
  const user = await findById(userId);
  if (!user || !Array.isArray(user.orders)) return null;
  const idx = user.orders.findIndex((o) => o.order_ref === orderRef || o.ref === orderRef);
  if (idx === -1) return null;
  user.orders[idx] = { ...user.orders[idx], ...updates };
  await pool.query('UPDATE users SET orders = $1 WHERE id = $2', [JSON.stringify(user.orders), userId]);
  return user.orders[idx];
}

// ----- Admin seeding -----

export async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@spencersbm').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const existing = await findByEmail(email);
  if (existing) {
    if (existing.role !== 'admin') await updateUser(existing.id, { role: 'admin' });
    return existing;
  }
  const admin = {
    id: 'admin-' + Date.now().toString(36),
    name: 'SpencerSBM Admin',
    email,
    password: await bcrypt.hash(password, 10),
    role: 'admin',
    orders: [],
    wallet: { balance: 0, currency: 'NGN', transactions: [], pendingFunds: {}, virtualAccount: null },
    createdAt: new Date().toISOString()
  };
  await createUser(admin);
  return admin;
}

// ----- Catalog (products + sales) -----

export async function getCatalog() {
  const { rows: numbers } = await pool.query('SELECT * FROM number_products ORDER BY created_at DESC');
  const { rows: accounts } = await pool.query('SELECT * FROM account_products ORDER BY created_at DESC');
  const { rows: sales } = await pool.query('SELECT * FROM sales ORDER BY created_at DESC LIMIT 5000');

  return {
    products: {
      numbers: numbers.map((n) => ({
        id: n.id,
        server: n.server,
        country: n.country,
        countryName: n.country_name,
        service: n.service,
        serviceName: n.service_name,
        price: Number(n.price),
        currency: n.currency,
        enabled: n.enabled,
        createdAt: n.created_at ? new Date(n.created_at).toISOString() : new Date().toISOString()
      })),
      accounts: accounts.map((a) => ({
        id: a.id,
        platform: a.platform,
        country: a.country || '',
        countryName: a.country_name || '',
        price: Number(a.price),
        currency: a.currency,
        desc: a.description,
        enabled: a.enabled,
        inventory: a.inventory || [],
        providerServer: a.provider_server || null,
        providerProductId: a.provider_product_id || null,
        providerCategory: a.provider_category || null,
        stock: Number(a.stock) || 0,
        createdAt: a.created_at ? new Date(a.created_at).toISOString() : new Date().toISOString()
      }))
    },
    sales: sales.map((s) => ({
      id: s.id,
      userId: s.user_id,
      userEmail: s.user_email,
      userName: s.user_name,
      type: s.type,
      productId: s.product_id,
      productName: s.product_name,
      price: Number(s.price),
      currency: s.currency,
      status: s.status,
      createdAt: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString()
    }))
  };
}

export async function addNumberProduct(product) {
  await pool.query(
    `INSERT INTO number_products (id, server, country, country_name, service, service_name, price, currency, enabled, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      product.id,
      product.server,
      product.country,
      product.countryName || product.country,
      product.service,
      product.serviceName || product.service,
      Number(product.price) || 0,
      product.currency || 'NGN',
      product.enabled ?? true,
      product.createdAt || new Date().toISOString()
    ]
  );
  return product;
}

export async function updateNumberProduct(id, updates) {
  const { rows } = await pool.query('SELECT * FROM number_products WHERE id = $1', [id]);
  if (!rows[0]) return null;
  const existing = rows[0];

  const price = updates.price !== undefined ? Number(updates.price) : Number(existing.price);
  const enabled = updates.enabled !== undefined ? Boolean(updates.enabled) : existing.enabled;

  const { rows: updated } = await pool.query(
    `UPDATE number_products SET price = $1, enabled = $2 WHERE id = $3 RETURNING *`,
    [price, enabled, id]
  );
  const n = updated[0];
  return {
    id: n.id,
    server: n.server,
    country: n.country,
    countryName: n.country_name,
    service: n.service,
    serviceName: n.service_name,
    price: Number(n.price),
    currency: n.currency,
    enabled: n.enabled,
    createdAt: n.created_at ? new Date(n.created_at).toISOString() : new Date().toISOString()
  };
}

export async function removeNumberProduct(id) {
  await pool.query('DELETE FROM number_products WHERE id = $1', [id]);
  return true;
}

export async function addAccountProduct(product) {
  await pool.query(
    `INSERT INTO account_products
       (id, platform, country, country_name, price, currency, description, enabled, inventory,
        provider_server, provider_product_id, provider_category, stock, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      product.id,
      product.platform,
      product.country || '',
      product.countryName || '',
      Number(product.price) || 0,
      product.currency || 'NGN',
      product.desc || '',
      product.enabled ?? true,
      JSON.stringify(product.inventory || []),
      product.providerServer || null,
      product.providerProductId || null,
      product.providerCategory || null,
      Number(product.stock) || 0,
      product.createdAt || new Date().toISOString()
    ]
  );
  return product;
}

export async function updateAccountProduct(id, updates) {
  const { rows } = await pool.query('SELECT * FROM account_products WHERE id = $1', [id]);
  if (!rows[0]) return null;
  const existing = rows[0];

  const price = updates.price !== undefined ? Number(updates.price) : Number(existing.price);
  const desc = updates.desc !== undefined ? String(updates.desc) : existing.description;
  const enabled = updates.enabled !== undefined ? Boolean(updates.enabled) : existing.enabled;
  const inventory = updates.inventory !== undefined ? updates.inventory : existing.inventory;
  const providerServer = updates.providerServer !== undefined ? updates.providerServer : existing.provider_server;
  const providerProductId = updates.providerProductId !== undefined ? updates.providerProductId : existing.provider_product_id;
  const providerCategory = updates.providerCategory !== undefined ? updates.providerCategory : existing.provider_category;
  const stock = updates.stock !== undefined ? Number(updates.stock) : Number(existing.stock);
  const platform = updates.platform !== undefined ? String(updates.platform) : existing.platform;
  const country = updates.country !== undefined ? String(updates.country) : existing.country;
  const countryName = updates.countryName !== undefined ? String(updates.countryName) : existing.country_name;

  const { rows: updated } = await pool.query(
    `UPDATE account_products
     SET price = $1, description = $2, enabled = $3, inventory = $4,
         provider_server = $5, provider_product_id = $6, provider_category = $7, stock = $8,
         platform = $9, country = $10, country_name = $11
     WHERE id = $12 RETURNING *`,
    [price, desc, enabled, JSON.stringify(inventory), providerServer, providerProductId, providerCategory, stock, platform, country, countryName, id]
  );
  const a = updated[0];
  return {
    id: a.id,
    platform: a.platform,
    country: a.country || '',
    countryName: a.country_name || '',
    price: Number(a.price),
    currency: a.currency,
    desc: a.description,
    enabled: a.enabled,
    inventory: a.inventory || [],
    providerServer: a.provider_server || null,
    providerProductId: a.provider_product_id || null,
    providerCategory: a.provider_category || null,
    stock: Number(a.stock) || 0,
    createdAt: a.created_at ? new Date(a.created_at).toISOString() : new Date().toISOString()
  };
}

export async function removeAccountProduct(id) {
  await pool.query('DELETE FROM account_products WHERE id = $1', [id]);
  return true;
}

export async function recordSale(sale) {
  await pool.query(
    `INSERT INTO sales (id, user_id, user_email, user_name, type, product_id, product_name, price, currency, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      sale.id,
      sale.userId,
      sale.userEmail || null,
      sale.userName || null,
      sale.type,
      sale.productId,
      sale.productName,
      Number(sale.price) || 0,
      sale.currency || 'NGN',
      sale.status || 'completed',
      sale.createdAt || new Date().toISOString()
    ]
  );
  return sale;
}

export async function getSales() {
  const { rows } = await pool.query('SELECT * FROM sales ORDER BY created_at DESC LIMIT 5000');
  return rows.map((s) => ({
    id: s.id,
    userId: s.user_id,
    userEmail: s.user_email,
    userName: s.user_name,
    type: s.type,
    productId: s.product_id,
    productName: s.product_name,
    price: Number(s.price),
    currency: s.currency,
    status: s.status,
    createdAt: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString()
  }));
}

// ----- Wallet -----

export async function getUserWallet(userId) {
  const user = await findById(userId);
  if (!user) return null;
  return {
    balance: Number(user.wallet.balance) || 0,
    currency: 'NGN',
    transactions: user.wallet.transactions,
    virtualAccount: user.wallet.virtualAccount,
    usdToNgn: await toNgn(1, 'USD')
  };
}

export async function setPendingFund(userId, reference, fund) {
  const user = await findById(userId);
  if (!user) return null;
  const pendingFunds = user.wallet.pendingFunds || {};
  pendingFunds[reference] = {
    ...fund,
    userId,
    createdAt: fund.createdAt || new Date().toISOString()
  };
  await pool.query('UPDATE users SET pending_funds = $1 WHERE id = $2', [JSON.stringify(pendingFunds), userId]);
  return pendingFunds[reference];
}

export async function findPendingFund(reference) {
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE pending_funds ? $1`,
    [reference]
  );
  if (!rows[0]) return null;
  const user = mapUserRow(rows[0]);
  const fund = user.wallet.pendingFunds[reference];
  return { user, fund };
}

export async function creditUserWallet(userId, { amount, currency, reference, chargeId, meta }) {
  const user = await findById(userId);
  if (!user) return null;

  const transactions = user.wallet.transactions || [];
  if (transactions.some((t) => t.reference === reference)) {
    return { balance: user.wallet.balance, currency: 'NGN' };
  }

  const ngn = await toNgn(Number(amount), currency);
  const newBalance = (Number(user.wallet.balance) || 0) + ngn;

  transactions.unshift({
    type: 'credit',
    kind: 'fund',
    amount: ngn,
    currency: 'NGN',
    reference,
    chargeId,
    status: 'completed',
    createdAt: new Date().toISOString(),
    meta
  });

  const slicedTransactions = transactions.slice(0, 500);

  await pool.query(
    'UPDATE users SET wallet_balance = $1, wallet_currency = $2, transactions = $3 WHERE id = $4',
    [newBalance, 'NGN', JSON.stringify(slicedTransactions), userId]
  );

  return { balance: newBalance, currency: 'NGN' };
}

export async function markFundSucceeded({ reference, chargeId, amount, currency, meta }) {
  const found = await findPendingFund(reference);
  if (!found) return false;
  const { user, fund } = found;
  if (fund.status === 'succeeded') return true;

  const pendingFunds = user.wallet.pendingFunds || {};
  pendingFunds[reference] = {
    ...fund,
    status: 'succeeded',
    chargeId,
    completedAt: new Date().toISOString(),
    raw: meta
  };

  await pool.query('UPDATE users SET pending_funds = $1 WHERE id = $2', [JSON.stringify(pendingFunds), user.id]);
  await creditUserWallet(user.id, { amount, currency, reference, chargeId, meta });
  return true;
}

export async function setVirtualAccount(userId, virtualAccount) {
  await pool.query('UPDATE users SET virtual_account = $1 WHERE id = $2', [JSON.stringify(virtualAccount), userId]);
  return virtualAccount;
}

export async function debitWallet(userId, { amount, reference, meta }) {
  const user = await findById(userId);
  if (!user) return { ok: false, error: 'User not found' };

  const balance = Number(user.wallet.balance) || 0;
  const cost = Number(amount) || 0;
  if (balance < cost) return { ok: false, error: 'insufficient' };

  const newBalance = balance - cost;
  const transactions = user.wallet.transactions || [];
  transactions.unshift({
    type: 'debit',
    kind: 'purchase',
    amount: cost,
    currency: 'NGN',
    reference,
    status: 'completed',
    createdAt: new Date().toISOString(),
    meta
  });

  const slicedTransactions = transactions.slice(0, 500);

  await pool.query(
    'UPDATE users SET wallet_balance = $1, wallet_currency = $2, transactions = $3 WHERE id = $4',
    [newBalance, 'NGN', JSON.stringify(slicedTransactions), userId]
  );

  return { ok: true, balance: newBalance };
}

// Refund money back into a user's wallet (e.g. cancelled order).
export async function creditWallet(userId, { amount, reference, meta }) {
  const user = await findById(userId);
  if (!user) return { ok: false, error: 'User not found' };

  const transactions = user.wallet.transactions || [];
  if (transactions.some((t) => t.reference === reference)) {
    return { ok: true, balance: user.wallet.balance, alreadyRefunded: true };
  }

  const value = Number(amount) || 0;
  const newBalance = (Number(user.wallet.balance) || 0) + value;

  transactions.unshift({
    type: 'credit',
    kind: 'refund',
    amount: value,
    currency: 'NGN',
    reference,
    status: 'completed',
    createdAt: new Date().toISOString(),
    meta
  });

  const slicedTransactions = transactions.slice(0, 500);

  await pool.query(
    'UPDATE users SET wallet_balance = $1, wallet_currency = $2, transactions = $3 WHERE id = $4',
    [newBalance, 'NGN', JSON.stringify(slicedTransactions), userId]
  );

  return { ok: true, balance: newBalance };
}

export async function toNgn(amount, currency) {
  const value = Number(amount) || 0;
  if (currency === 'USD') {
    const rate = await getUsdToNgnRate();
    return Math.round(value * rate);
  }
  return Math.round(value);
}