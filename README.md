# Sabi Biz - Unified SaaS Application

A unified, production-ready SaaS platform combining:
- **BizTrack**: Accounting software for Nigerian market women
- **SabiReply**: WhatsApp AI Assistant for businesses

## 📁 Project Structure

```
sabi-biz-unified/
├── backend/              # Express + PostgreSQL API
│   ├── src/
│   │   ├── server.js
│   │   ├── config/       # Database, logger, migrations
│   │   ├── middleware/   # Auth, error handling, validation
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── utils/        # Helpers, validators, formatters
│   │   └── models/       # Database schemas
│   ├── migrations/       # SQL migration files
│   ├── seeds/           # Sample data
│   ├── tests/           # Jest test files
│   └── package.json
│
├── frontend/             # User PWA application
│   ├── public/
│   │   ├── index.html   # Main app
│   │   ├── manifest.json # PWA manifest
│   │   ├── sw.js        # Service worker (offline)
│   │   ├── css/         # Stylesheets
│   │   ├── js/          # App logic
│   │   └── icons/       # App icons
│   └── package.json
│
├── admin/                # Admin dashboard
│   ├── public/
│   │   ├── index.html   # Admin interface
│   │   ├── css/         # Styles
│   │   ├── js/          # Admin logic
│   └── package.json
│
├── mobile/              # React Native / Flutter (future)
│
├── docker-compose.yml   # Local PostgreSQL setup
├── .env.example        # Environment variables template
├── README.md
└── package.json        # Root workspace config
```

## 🚀 Quick Start

### 1. Clone & Setup
```bash
git clone <repo-url>
cd sabi-biz-unified
npm install
```

### 2. Set Up Environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials
```

### 3. Start PostgreSQL (Docker)
```bash
docker-compose up -d
```

### 4. Run Migrations
```bash
npm run migrate
```

### 5. Start Development Servers
```bash
# All three servers in parallel
npm run dev

# Or individually
npm run dev:backend    # http://localhost:3000
npm run dev:frontend   # http://localhost:5173
npm run dev:admin      # http://localhost:5174
```

## 📚 API Documentation

### Available Endpoints (TO BE ADDED)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/apple` - Apple Sign-In
- `POST /api/whatsapp/webhook` - WhatsApp webhook receiver
- `POST /api/whatsapp/send` - Send WhatsApp message
- `GET /api/business/invoices` - Get user's invoices
- `GET /api/subscriptions` - Get subscription info
- `GET /api/admin/users` - List all users (admin only)

## 🔧 Environment Variables

See [backend/.env.example](backend/.env.example) for all required variables.

### Key Variables
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `WHATSAPP_TOKEN` - Meta WhatsApp Business API token
- `PAYSTACK_SECRET` - Paystack payment gateway secret
- `OPENAI_API_KEY` - OpenAI API key (for AI features)

## 🗄️ Database

Uses PostgreSQL with automatic migrations.

```bash
# Run migrations
npm run migrate

# Seed sample data
npm run seed
```

## 🧪 Testing

```bash
npm test
```

## 📦 Deployment

### Railway (Recommended)
1. Create new Railway project
2. Connect your GitHub repo
3. Set environment variables in Railway dashboard
4. Deploy

See [SETUP.md](backend/SETUP.md) for detailed instructions.

## 📖 Documentation

- [CONSOLIDATION_PLAN.md](../CONSOLIDATION_PLAN.md) - Consolidation strategy
- [ARCHITECTURE_DIAGRAM.md](../ARCHITECTURE_DIAGRAM.md) - System architecture
- [CODE_CONSOLIDATION_GUIDE.md](../CODE_CONSOLIDATION_GUIDE.md) - Code merge details

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Submit a pull request

## 📄 License

MIT

## 👥 Team

Sabi Team - Building tools for Nigerian entrepreneurs

---

**Status**: 🚧 Under Development

Next Steps:
- [ ] Merge authentication systems
- [ ] Merge WhatsApp integration
- [ ] Merge subscription billing
- [ ] Create database migrations
- [ ] Build frontend UI
- [ ] Build admin dashboard
- [ ] Write tests
- [ ] Deploy to Railway
