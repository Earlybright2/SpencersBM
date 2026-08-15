import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { pool } from './utils/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const CATALOG_FILE = path.join(__dirname, 'data', 'catalog.json');

async function migrate() {
  console.log('Starting PostgreSQL Database Migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create tables & add missing columns to existing tables
    console.log('Ensuring database tables and columns exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(14, 2) DEFAULT 0.00;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_currency VARCHAR(10) DEFAULT 'NGN';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS flw_customer_id VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS orders JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS transactions JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_funds JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS virtual_account JSONB DEFAULT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

      CREATE TABLE IF NOT EXISTS number_products (
        id VARCHAR(255) PRIMARY KEY,
        server VARCHAR(100) NOT NULL,
        country VARCHAR(100) NOT NULL,
        country_name VARCHAR(255) NOT NULL,
        service VARCHAR(100) NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        price NUMERIC(14, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'NGN',
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS account_products (
        id VARCHAR(255) PRIMARY KEY,
        platform VARCHAR(255) NOT NULL,
        country VARCHAR(100) DEFAULT '',
        country_name VARCHAR(255) DEFAULT '',
        price NUMERIC(14, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'NGN',
        description TEXT DEFAULT '',
        enabled BOOLEAN DEFAULT true,
        inventory JSONB DEFAULT '[]'::jsonb,
        provider_server VARCHAR(100) DEFAULT NULL,
        provider_product_id VARCHAR(255) DEFAULT NULL,
        provider_category VARCHAR(255) DEFAULT NULL,
        stock NUMERIC(10, 0) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE account_products ADD COLUMN IF NOT EXISTS provider_server VARCHAR(100) DEFAULT NULL;
      ALTER TABLE account_products ADD COLUMN IF NOT EXISTS provider_product_id VARCHAR(255) DEFAULT NULL;
      ALTER TABLE account_products ADD COLUMN IF NOT EXISTS provider_category VARCHAR(255) DEFAULT NULL;
      ALTER TABLE account_products ADD COLUMN IF NOT EXISTS stock NUMERIC(10, 0) DEFAULT 0;
      ALTER TABLE account_products ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT '';
      ALTER TABLE account_products ADD COLUMN IF NOT EXISTS country_name VARCHAR(255) DEFAULT '';

      CREATE TABLE IF NOT EXISTS sales (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        user_email VARCHAR(255),
        user_name VARCHAR(255),
        type VARCHAR(100) NOT NULL,
        product_id VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        price NUMERIC(14, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'NGN',
        status VARCHAR(50) DEFAULT 'completed',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Import users.json
    try {
      const usersRaw = await readFile(USERS_FILE, 'utf8');
      const usersData = JSON.parse(usersRaw);
      const usersList = usersData.users || [];
      console.log(`Migrating ${usersList.length} users from users.json...`);
      for (const u of usersList) {
        await client.query(
          `INSERT INTO users (id, name, email, password, role, wallet_balance, wallet_currency, flw_customer_id, orders, transactions, pending_funds, virtual_account, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (email) DO UPDATE SET
             name = EXCLUDED.name,
             password = EXCLUDED.password,
             role = EXCLUDED.role,
             wallet_balance = EXCLUDED.wallet_balance,
             wallet_currency = EXCLUDED.wallet_currency,
             flw_customer_id = EXCLUDED.flw_customer_id,
             orders = EXCLUDED.orders,
             transactions = EXCLUDED.transactions,
             pending_funds = EXCLUDED.pending_funds,
             virtual_account = EXCLUDED.virtual_account`,
          [
            u.id,
            u.name,
            u.email,
            u.password,
            u.role || 'user',
            Number(u.wallet?.balance) || 0,
            u.wallet?.currency || 'NGN',
            u.wallet?.flwCustomerId || null,
            JSON.stringify(u.orders || []),
            JSON.stringify(u.wallet?.transactions || []),
            JSON.stringify(u.wallet?.pendingFunds || {}),
            u.wallet?.virtualAccount ? JSON.stringify(u.wallet.virtualAccount) : null,
            u.createdAt || new Date().toISOString()
          ]
        );
      }
    } catch (err) {
      console.log('users.json read/migration skipped or failed:', err.message);
    }

    // 3. Import catalog.json
    try {
      const catalogRaw = await readFile(CATALOG_FILE, 'utf8');
      const catalogData = JSON.parse(catalogRaw);

      const numberProds = catalogData.products?.numbers || [];
      console.log(`Migrating ${numberProds.length} number products from catalog.json...`);
      for (const p of numberProds) {
        await client.query(
          `INSERT INTO number_products (id, server, country, country_name, service, service_name, price, currency, enabled, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             price = EXCLUDED.price,
             enabled = EXCLUDED.enabled`,
          [
            p.id,
            p.server,
            p.country,
            p.countryName || p.country,
            p.service,
            p.serviceName || p.service,
            Number(p.price) || 0,
            p.currency || 'NGN',
            p.enabled ?? true,
            p.createdAt || new Date().toISOString()
          ]
        );
      }

      const accountProds = catalogData.products?.accounts || [];
      console.log(`Migrating ${accountProds.length} account products from catalog.json...`);
      for (const p of accountProds) {
        await client.query(
          `INSERT INTO account_products (id, platform, country, country_name, price, currency, description, enabled, inventory, provider_server, provider_product_id, provider_category, stock, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id) DO UPDATE SET
             price = EXCLUDED.price,
             description = EXCLUDED.description,
             enabled = EXCLUDED.enabled,
             inventory = EXCLUDED.inventory,
             provider_server = EXCLUDED.provider_server,
             provider_product_id = EXCLUDED.provider_product_id,
             provider_category = EXCLUDED.provider_category,
             stock = EXCLUDED.stock,
             country = EXCLUDED.country,
             country_name = EXCLUDED.country_name`,
          [
            p.id,
            p.platform,
            p.country || '',
            p.countryName || '',
            Number(p.price) || 0,
            p.currency || 'NGN',
            p.desc || '',
            p.enabled ?? true,
            JSON.stringify(p.inventory || []),
            p.providerServer || null,
            p.providerProductId || null,
            p.providerCategory || null,
            Number(p.stock) || 0,
            p.createdAt || new Date().toISOString()
          ]
        );
      }

      const salesList = catalogData.sales || [];
      console.log(`Migrating ${salesList.length} sales records from catalog.json...`);
      for (const s of salesList) {
        await client.query(
          `INSERT INTO sales (id, user_id, user_email, user_name, type, product_id, product_name, price, currency, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO NOTHING`,
          [
            s.id,
            s.userId,
            s.userEmail || null,
            s.userName || null,
            s.type,
            s.productId,
            s.productName,
            Number(s.price) || 0,
            s.currency || 'NGN',
            s.status || 'completed',
            s.createdAt || new Date().toISOString()
          ]
        );
      }
    } catch (err) {
      console.log('catalog.json read/migration skipped or failed:', err.message);
    }

    await client.query('COMMIT');
    console.log('Migration Completed Successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration Failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
