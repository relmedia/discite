# Backend API

NestJS backend for the Discite multi-tenant application.

## Database Setup

### Using Docker (Recommended)

1. **Start PostgreSQL with Docker:**
   ```bash
   # From the project root
   docker-compose up -d
   ```

2. **Verify the database is running:**
   ```bash
   docker-compose ps
   ```

3. **Stop the database:**
   ```bash
   docker-compose down
   ```

4. **Stop and remove all data:**
   ```bash
   docker-compose down -v
   ```

### Using Local PostgreSQL

If you prefer to use a local PostgreSQL installation, update the `.env` file with your connection details.

## Environment Variables

The application uses the following environment variables (defined in `.env`):

```env
# Server
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=myapp

# Frontend
FRONTEND_URL=http://localhost:3000
```

## Development

```bash
# Install dependencies (from project root)
pnpm install

# Start the development server
pnpm --filter backend dev

# Build
pnpm --filter backend build

# Run linter
pnpm --filter backend lint
```

## Database Schema

The database schema is managed using TypeORM entities (code-first approach):

- **Entities:** `src/infrastructure/database/entities/`
  - `tenant.entity.ts` - Tenant/organization table
  - `user.entity.ts` - Users table (multi-tenant)

- **Auto-sync:** In development, the schema automatically syncs with the database
- **Production:** Disable `synchronize` and use migrations

## Architecture

This backend follows Clean Architecture / DDD principles:

```
src/
├── common/              # Shared utilities, decorators, middleware
├── infrastructure/      # External concerns (database, etc.)
├── modules/
│   ├── tenant/
│   │   ├── domain/          # Business logic & aggregates
│   │   ├── application/     # Use cases & services
│   │   └── presentation/    # Controllers & DTOs
│   └── user/
│       ├── domain/
│       ├── application/
│       └── presentation/
└── main.ts             # Application entry point
```

## API Endpoints

### Tenants
- `POST /api/tenants` - Create a new tenant
- `GET /api/tenants` - Get all tenants
- `GET /api/tenants/:id` - Get tenant by ID

### Users
- `POST /api/users` - Create a new user (requires tenant header)
- `GET /api/users` - Get all users for tenant
- `GET /api/users/:id` - Get user by ID

**Note:** All user endpoints require the `X-Tenant-Id` or `X-Tenant-Subdomain` header except for tenant creation.
