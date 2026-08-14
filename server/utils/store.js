import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');

let cache = null;
let catalogCache = null;

async function ensureFile(file, fallback) {
  try {
    await readFile(file, 'utf8');
  } catch {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(file, JSON.stringify(fallback, null, 2), 'utf8');
  }
}

// ----- Users -----

export async function getUsers() {
  if (cache) return cache;
  await ensureFile(USERS_FILE, { users: [] });
  const raw = await readFile(USERS_FILE, 'utf8');
  cache = JSON.parse(raw);
  return cache;
}

export async function saveUsers(data) {
  cache = data;
  await ensureFile(USERS_FILE, { users: [] });
  await writeFile(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export async function findByEmail(email) {
  const db = await getUsers();
  return db.users.find((u) => u.email === email) || null;
}

export async function findById(id) {
  const db = await getUsers();
  return db.users.find((u) => u.id === id) || null;
}

export async function createUser(user) {
  const db = await getUsers();
  db.users.push(user);
  await saveUsers(db);
  return user;
}

export async function updateUser(id, updates) {
  const db = await getUsers();
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], ...updates };
  await saveUsers(db);
  return db.users[idx];
}

export async function countUsers() {
  const db = await getUsers();
  return db.users.length;
}

export async function getUserOrders(userId) {
  const user = await findById(userId);
  return user?.orders || [];
}

export async function addUserOrder(userId, order) {
  const user = await findById(userId);
  if (!user) return null;
  if (!Array.isArray(user.orders)) user.orders = [];
  user.orders.unshift(order);
  user.orders = user.orders.slice(0, 500);
  await saveUsers(await getUsers());
  return order;
}

export async function updateUserOrder(userId, orderRef, updates) {
  const user = await findById(userId);
  if (!user || !Array.isArray(user.orders)) return null;
  const idx = user.orders.findIndex((o) => o.order_ref === orderRef || o.ref === orderRef);
  if (idx === -1) return null;
  user.orders[idx] = { ...user.orders[idx], ...updates };
  await saveUsers(await getUsers());
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
    name: 'SpencersBM Admin',
    email,
    password: await bcrypt.hash(password, 10),
    role: 'admin',
    orders: [],
    wallet: defaultWallet(),
    createdAt: new Date().toISOString()
  };
  await createUser(admin);
  return admin;
}

// ----- Catalog (products + sales) -----

function defaultCatalog() {
  return { products: { numbers: [], accounts: [] }, sales: [] };
}

export async function getCatalog() {
  if (catalogCache) return catalogCache;
  await ensureFile(CATALOG_FILE, defaultCatalog());
  const raw = await readFile(CATALOG_FILE, 'utf8');
  catalogCache = JSON.parse(raw);
  if (!catalogCache.products) catalogCache.products = { numbers: [], accounts: [] };
  if (!catalogCache.products.numbers) catalogCache.products.numbers = [];
  if (!catalogCache.products.accounts) catalogCache.products.accounts = [];
  if (!Array.isArray(catalogCache.sales)) catalogCache.sales = [];
  return catalogCache;
}

export async function saveCatalog(data) {
  catalogCache = data;
  await ensureFile(CATALOG_FILE, defaultCatalog());
  await writeFile(CATALOG_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export async function addNumberProduct(product) {
  const db = await getCatalog();
  db.products.numbers.unshift(product);
  await saveCatalog(db);
  return product;
}

export async function updateNumberProduct(id, updates) {
  const db = await getCatalog();
  const idx = db.products.numbers.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  db.products.numbers[idx] = { ...db.products.numbers[idx], ...updates };
  await saveCatalog(db);
  return db.products.numbers[idx];
}

export async function removeNumberProduct(id) {
  const db = await getCatalog();
  db.products.numbers = db.products.numbers.filter((p) => p.id !== id);
  await saveCatalog(db);
  return true;
}

export async function addAccountProduct(product) {
  const db = await getCatalog();
  db.products.accounts.unshift(product);
  await saveCatalog(db);
  return product;
}

export async function updateAccountProduct(id, updates) {
  const db = await getCatalog();
  const idx = db.products.accounts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  db.products.accounts[idx] = { ...db.products.accounts[idx], ...updates };
  await saveCatalog(db);
  return db.products.accounts[idx];
}

export async function removeAccountProduct(id) {
  const db = await getCatalog();
  db.products.accounts = db.products.accounts.filter((p) => p.id !== id);
  await saveCatalog(db);
  return true;
}

export async function recordSale(sale) {
  const db = await getCatalog();
  db.sales.unshift(sale);
  db.sales = db.sales.slice(0, 5000);
  await saveCatalog(db);
  return sale;
}

export async function getSales() {
  const db = await getCatalog();
  return db.sales;
}

// ----- Wallet (single NGN currency) -----

function defaultWallet() {
  return { balance: 0, currency: 'NGN', transactions: [], pendingFunds: {}, virtualAccount: null };
}

function ensureWallet(user) {
  if (!user.wallet) user.wallet = defaultWallet();
  if (!Array.isArray(user.wallet.transactions)) user.wallet.transactions = [];
  if (!user.wallet.pendingFunds || typeof user.wallet.pendingFunds !== 'object') {
    user.wallet.pendingFunds = {};
  }
  if (!user.wallet.virtualAccount) user.wallet.virtualAccount = null;
  return user.wallet;
}

export async function getUserWallet(userId) {
  const user = await findById(userId);
  if (!user) return null;
  const wallet = ensureWallet(user);
  return {
    balance: Number(wallet.balance) || 0,
    currency: 'NGN',
    transactions: wallet.transactions,
    virtualAccount: wallet.virtualAccount,
    usdToNgn: toNgn(1, 'USD')
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
  await saveUsers(await getUsers());
  return wallet.pendingFunds[reference];
}

export async function findPendingFund(reference) {
  const db = await getUsers();
  for (const user of db.users) {
    const fund = user.wallet?.pendingFunds?.[reference];
    if (fund) return { user, fund };
  }
  return null;
}

// Records a wallet transaction without touching the balance (credit already settled).
function pushTransaction(wallet, entry) {
  wallet.transactions.unshift(entry);
  wallet.transactions = wallet.transactions.slice(0, 500);
}

export async function creditUserWallet(userId, { amount, currency, reference, chargeId, meta }) {
  const user = await findById(userId);
  if (!user) return null;
  const wallet = ensureWallet(user);
  if (wallet.transactions.some((t) => t.reference === reference)) {
    return { balance: wallet.balance, currency: 'NGN' };
  }
  const ngn = toNgn(Number(amount), currency);
  wallet.balance = (Number(wallet.balance) || 0) + ngn;
  wallet.currency = 'NGN';
  pushTransaction(wallet, {
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
  await saveUsers(await getUsers());
  return { balance: wallet.balance, currency: 'NGN' };
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
  await creditUserWallet(user.id, { amount, currency, reference, chargeId, meta });
  return true;
}

export async function setVirtualAccount(userId, virtualAccount) {
  const user = await findById(userId);
  if (!user) return null;
  const wallet = ensureWallet(user);
  wallet.virtualAccount = virtualAccount;
  await saveUsers(await getUsers());
  return virtualAccount;
}

// Deducts NGN from the wallet. Returns { ok, balance } or { ok:false, error:'insufficient' }.
export async function debitWallet(userId, { amount, reference, meta }) {
  const user = await findById(userId);
  if (!user) return { ok: false, error: 'User not found' };
  const wallet = ensureWallet(user);
  const balance = Number(wallet.balance) || 0;
  const cost = Number(amount) || 0;
  if (balance < cost) return { ok: false, error: 'insufficient' };
  wallet.balance = balance - cost;
  wallet.currency = 'NGN';
  pushTransaction(wallet, {
    type: 'debit',
    kind: 'purchase',
    amount: cost,
    currency: 'NGN',
    reference,
    status: 'completed',
    createdAt: new Date().toISOString(),
    meta
  });
  await saveUsers(await getUsers());
  return { ok: true, balance: wallet.balance };
}

// NGN is the base currency; USD credits convert at the admin-set rate.
export function toNgn(amount, currency) {
  const value = Number(amount) || 0;
  if (currency === 'USD') {
    const rate = Number(process.env.USD_TO_NGN_RATE) || 1500;
    return Math.round(value * rate);
  }
  return Math.round(value);
}