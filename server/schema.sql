-- Schema definition for SpencersBM PostgreSQL database

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  wallet_balance NUMERIC(14, 2) DEFAULT 0.00,
  wallet_currency VARCHAR(10) DEFAULT 'NGN',
  flw_customer_id VARCHAR(255),
  orders JSONB DEFAULT '[]'::jsonb,
  transactions JSONB DEFAULT '[]'::jsonb,
  pending_funds JSONB DEFAULT '{}'::jsonb,
  virtual_account JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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
