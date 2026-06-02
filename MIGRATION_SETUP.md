# Database Migration Setup Guide

## Current Status
- ✅ Migration SQL files created: `backend/migrations/003_sales_and_inventory_cost.sql`
- ✅ Backend code ready for sales tracking feature
- ✅ Winston dependency upgraded (async module issue resolved)
- ⏳ **BLOCKED**: Database migrations not yet executed (need PostgreSQL connection)

## Why Migrations are Pending
The migration adds:
1. `cost_price` column to `inventory` table
2. New `sales` table with 14 columns for tracking sales transactions
3. 4 indexes for query optimization

Without these schema changes, the sales feature endpoints will fail with "column does not exist" errors.

## Solution: Choose One Approach

### ✅ Approach 1: Local PostgreSQL (RECOMMENDED FOR TESTING)

**Install PostgreSQL on Windows:**
1. Download: https://www.postgresql.org/download/windows/
2. During installation:
   - Username: `postgres`
   - Password: `password`
   - Port: `5432`
3. Create database:
   ```sql
   CREATE DATABASE sabibiz;
   ```
4. Run migrations:
   ```bash
   cd backend
   npm run migrate
   ```

**Verify success:**
```bash
# Should show: "✓ Migrations completed: 3 new migrations executed"
```

---

### ✅ Approach 2: WSL + PostgreSQL (Linux on Windows)

```bash
# In WSL terminal
wsl
sudo apt update
sudo apt install postgresql

# Start PostgreSQL
sudo service postgresql start

# Create database
sudo -u postgres createdb sabibiz

# From Windows terminal, set .env to:
DATABASE_URL=postgresql://postgres@localhost/sabibiz
DB_PASSWORD=<empty>
```

---

### ✅ Approach 3: Neon Cloud Database (PRODUCTION)

**Your Neon Connection:**
- Pooled: `postgresql://neondb_owner:npg_2xSnZPWD7BHI@ep-nameless-grass-aq8doe2i-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
- Status: Currently timing out from local machine (may work from Render server)

**To use Neon for migrations:**
1. Get the unpooled connection string from https://console.neon.tech
   - Connection > Unpooled > Copy connection string
2. Update `backend/.env`:
   ```
   DATABASE_URL=postgresql://neondb_owner:npg_...@ep-...neon.tech/neondb?sslmode=verify-full
   DB_SSL=true
   ```
3. Try: `npm run migrate`

**If still timing out:**
- Neon may have IP whitelisting enabled
- The timeout might be temporary
- Once deployed to Render, the backend will migrate automatically on first startup if configured correctly

---

## Next Steps

1. **Pick one approach above** - for quick testing, use local PostgreSQL (Approach 1)
2. **Run the migration**:
   ```bash
   cd backend
   npm run migrate
   ```
3. **Verify the schema** - Check your database has `sales` table and `inventory.cost_price` column
4. **Test the sales API**:
   ```bash
   npm run dev
   # Try: POST /api/business/sales with test data
   ```
5. **Push to GitHub** - Once verified locally, push all commits:
   ```bash
   git push origin main
   ```

---

## Rollback (if needed)

If you need to undo migrations, manually delete rows from the `migrations` table:

```sql
DELETE FROM migrations WHERE name IN (
  '001_initial_schema.sql',
  '002_admin_users.sql', 
  '003_sales_and_inventory_cost.sql'
);
```

Then the `npm run migrate` script will re-run them on next execution.

---

## Production Deployment

Once migrations run successfully locally:
1. Render backend will use Neon database via `DATABASE_URL` environment variable
2. On Render startup, the backend will automatically run pending migrations
3. Sales tracking feature will be fully operational

---

## Files Modified
- `backend/package.json` - Winston upgraded
- `backend/migrations/003_sales_and_inventory_cost.sql` - Sales schema
- `backend/.env` - Local PostgreSQL configuration (not committed, for your use only)

---

**Questions?** Check the migration logs in `backend/logs/` directory after running `npm run migrate`.
