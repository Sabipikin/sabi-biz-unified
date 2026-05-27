# Sabi Biz Unified - Setup Guide

## Quick Start (5 minutes)

### 1. Prerequisites
- Node.js 18+
- Docker & Docker Compose (for PostgreSQL)
- Git

### 2. Clone & Install
```bash
git clone <your-repo-url>
cd sabi-biz-unified
npm install
```

### 3. Setup Database
```bash
# Start PostgreSQL
docker-compose up -d

# Run migrations
npm run migrate

# Seed sample data
npm run seed
```

### 4. Configure Environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
```

### 5. Start Development
```bash
npm run dev
```

This will start:
- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:5173  
- **Admin Dashboard**: http://localhost:5174

## Test Credentials (After Seeding)

```
Admin User:
  Email: admin@sabibiz.com
  Password: Admin@123456

Sample User:
  Email: user@sabibiz.com
  Password: User@123456
```

## 📚 Documentation

- **[README.md](./README.md)** - Project overview
- **[../CONSOLIDATION_PLAN.md](../CONSOLIDATION_PLAN.md)** - Consolidation strategy
- **[../ARCHITECTURE_DIAGRAM.md](../ARCHITECTURE_DIAGRAM.md)** - System architecture

## 🔧 Available Commands

```bash
# Development
npm run dev              # Start all servers
npm run dev:backend     # Backend only
npm run dev:frontend    # Frontend only
npm run dev:admin       # Admin only

# Database
npm run migrate         # Run database migrations
npm run seed           # Seed sample data

# Testing
npm test               # Run all tests

# Workspace
npm install:all        # Install all dependencies
```

## 🐳 Docker

### View logs
```bash
docker-compose logs -f postgres
```

### Stop services
```bash
docker-compose down
```

### Reset database
```bash
docker-compose down -v  # Remove volumes
docker-compose up -d    # Start fresh
npm run migrate
npm run seed
```

## 🚀 Deployment

### Railway
1. Create Railway account at https://railway.app
2. Connect GitHub repo
3. Set environment variables
4. Deploy

### Environment Variables
See `backend/.env.example` for all required variables

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push branch: `git push origin feature/amazing-feature`
4. Open pull request

## ❓ Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
kill -9 $(lsof -t -i:3000)
```

### Database connection error
```bash
# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs postgres
```

### Migration failed
```bash
# Reset and reseed
docker-compose down -v
docker-compose up -d
npm run migrate
npm run seed
```

## 📞 Support

For issues or questions:
1. Check existing documentation
2. Review error logs
3. Create GitHub issue

---

**Happy Building! 🚀**
