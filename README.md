# HAFSA Travel Backend API

Express API for **hajj_umrah** (staff/manager) and **custumerSide** (customers).

## Folder structure (si aad u fahamto)

```
backend/
├── .env                    ← secrets (PORT, DATABASE_URL, Supabase keys)
├── package.json
├── scripts/                ← tools (dev server, kill port, SQL setup)
│   ├── dev.mjs
│   ├── kill-dev.mjs
│   └── setup-supabase.sql
└── src/
    ├── index.js            ← START: server-ka wuxuu halkan ka bilaabmaa
    ├── app.js              ← Express + CORS + JSON + routes
    │
    ├── config/             ← settings
    │   ├── env.js          ← akhriyaa .env
    │   └── supabase.js     ← file upload (Storage)
    │
    ├── db/                 ← database
    │   ├── pool.js         ← PostgreSQL connection
    │   ├── schema.sql      ← tables
    │   └── runSchema.js    ← abuuraa tables + seed data
    │
    ├── middleware/
    │   └── auth.js         ← JWT login check (admin / customer / manager)
    │
    ├── routes/             ← API endpoints (URL-yada)
    │   ├── index.js        ← isku xiraa dhammaan routes
    │   ├── public.js       ← /api/public/*  (website, login la'aan)
    │   ├── admin/          ← /api/admin/*   (hajj_umrah)
    │   │   ├── index.js
    │   │   ├── auth.js         ← login staff
    │   │   ├── bootstrap.js    ← load/save dhammaan xogta
    │   │   ├── users.js        ← staff users
    │   │   ├── customers.js    ← password + serial
    │   │   ├── documents.js    ← file upload
    │   │   ├── settings.js     ← company settings + logo
    │   │   └── audit.js        ← audit logs
    │   └── customer/       ← /api/customer/* (custumerSide)
    │       ├── index.js
    │       ├── auth.js         ← login macaamiil
    │       └── dashboard.js    ← visa, ticket, payments
    │
    ├── services/           ← business logic (SQL + rules)
    │   ├── bootstrapService.js
    │   └── settingsService.js
    │
    └── utils/
        ├── helpers.js      ← audit log, counters, file size
        └── mappers.js      ← DB row → JSON (camelCase)
```

**Qaybta la eego markaad beddelayso:**

| Waxaad rabto inaad beddesho | File |
|----------------------------|------|
| Login staff | `routes/admin/auth.js` |
| Login macaamiil | `routes/customer/auth.js` |
| Settings / logo | `routes/admin/settings.js` |
| File upload | `routes/admin/documents.js` + `config/supabase.js` |
| Tables SQL | `db/schema.sql` |
| Seed / demo users | `db/runSchema.js` |
| Env vars | `.env` |

## Setup

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in `.env`:
   - **Local PostgreSQL:** `postgresql://postgres:PASSWORD@localhost:5432/hafsa_travel`
   - `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` — file uploads

3. Install and create tables + seed:
   ```bash
   npm install
   npm run db:schema
   ```

4. Start:
   ```bash
   npm run dev
   ```

API: `http://localhost:4000`

## Endpoints

| Route | Description |
|-------|-------------|
| `GET /api/health` | Health + DB status |
| `POST /api/admin/auth/login` | Staff/manager/admin login |
| `GET /api/admin/bootstrap` | Full admin data |
| `PUT /api/admin/sync` | Save admin data |
| `POST /api/admin/documents/upload` | Upload file |
| `GET/PUT /api/admin/settings` | Company settings |
| `POST /api/admin/settings/logo` | Upload logo |
| `POST /api/customer/auth/login` | Customer login |
| `GET /api/customer/dashboard` | Customer portal |
| `GET /api/public/packages` | Public packages |
| `POST /api/public/contact` | Contact form |

## Demo accounts

**hajj_umrah:** `admin`/`admin123` · `manager1`/`manager123` · `staff1`/`staff123`

**custumerSide:** `HT-2024-001`/`password123`

## Frontend env

**hajj_umrah** `.env`:
```
VITE_API_URL=http://localhost:4000
```

**custumerSide** `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```
