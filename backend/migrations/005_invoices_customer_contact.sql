ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS delivery_address TEXT;
