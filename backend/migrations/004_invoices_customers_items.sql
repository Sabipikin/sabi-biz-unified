-- Add customer master and invoice item details for invoice tracking

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS auto_mail BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_whatsapp BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sent_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sent_method VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  unit VARCHAR(50),
  quantity INT NOT NULL DEFAULT 0,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_name ON invoice_items(product_name);
