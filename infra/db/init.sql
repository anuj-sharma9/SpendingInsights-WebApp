-- Seed data for local development.
-- Replace the firebase_uid below with your actual Firebase UID.

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  amount NUMERIC(12, 2) NOT NULL,
  category VARCHAR(255) NOT NULL,
  merchant VARCHAR(255) NOT NULL,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO users (id, firebase_uid, email, created_at)
VALUES (1, 'tZZwIRG5Q7XyH4tarlrQCNMYkS02', 'anujsharma45545@gmail.com', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO transactions (user_id, amount, category, merchant, transaction_date, created_at)
VALUES
  (1, 54.21, 'Groceries', 'Whole Foods', CURRENT_DATE - INTERVAL '1 day', NOW()),
  (1, 18.75, 'Coffee', 'Starbucks', CURRENT_DATE - INTERVAL '2 days', NOW()),
  (1, 120.00, 'Utilities', 'PG&E', CURRENT_DATE - INTERVAL '4 days', NOW()),
  (1, 42.10, 'Dining', 'Chipotle', CURRENT_DATE - INTERVAL '6 days', NOW()),
  (1, 250.00, 'Rent', 'Apartment', CURRENT_DATE - INTERVAL '10 days', NOW())
ON CONFLICT DO NOTHING;
