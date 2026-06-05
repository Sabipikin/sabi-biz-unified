-- Enhanced sales recording with multiple products, customer tracking, and adjustments

ALTER TABLE sales
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS bonus_adjustment DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS adjustment_reason VARCHAR(255),
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS auto_recorded BOOLEAN DEFAULT FALSE;

-- Add index for customer and invoice lookups
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_id ON sales(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_auto_recorded ON sales(auto_recorded);
