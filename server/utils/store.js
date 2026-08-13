import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

let cache = null;

async function ensureFile() {
  try {
    await readFile(USERS_FILE, 'utf8');
  } catch {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(USERS_FILE, JSON.stringify({ users: [] }, null, 2), 'utf8');
  }
}

export async function getUsers() {
  if (cache) return cache;
  await ensureFile();
  const raw = await readFile(USERS_FILE, 'utf8');
  cache = JSON.parse(raw);
  return cache;
}

export async function saveUsers(data) {
  cache = data;
  await ensureFile();
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