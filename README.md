# CHW Backend — Community Health Worker API

A production-grade REST API backend for community health workers (CHWs) operating in Kenya. Supports patient management, visit logging, health data tracking, follow-up alerts, and SMS notification triggers — designed for low-resource environments with intermittent connectivity in mind.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the App](#running-the-app)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Database Schema (ERD)](#database-schema-erd)
- [Design Decisions](#design-decisions)

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | >= 18.x | LTS recommended |
| PostgreSQL | >= 14 | Local or remote |
| npm | >= 9.x | Comes with Node |

Install Node.js via [nvm](https://github.com/nvm-sh/nvm):
```bash
nvm install 20
nvm use 20
```

Install PostgreSQL on Ubuntu/Debian:
```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres psql -c "CREATE USER chw_user WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "CREATE DATABASE chw_db OWNER chw_user;"
```

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/chw-backend.git
cd chw-backend

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env

# 4. Edit .env with your values (see section below)
nano .env
```

---

## Environment Variables

Create a `.env` file in the project root. All required variables must be set or the app will not start.

```env
# Application
NODE_ENV=development        # development | production
PORT=3000                   # Port to listen on

# Database
DATABASE_URL="postgresql://chw_user:yourpassword@localhost:5432/chw_db?schema=public"

# JWT — CHANGE THIS IN PRODUCTION, use a long random string
JWT_SECRET=change-me-to-something-very-long-and-random
JWT_EXPIRES_IN=7d           # Token lifetime (7d, 24h, 1h, etc.)

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000 # 15 minutes in milliseconds
RATE_LIMIT_MAX=100          # Max requests per window per IP

# CORS — set to your frontend origin
CORS_ORIGIN=http://localhost:3001
```

**Generating a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Database Setup

### Option A — Prisma Migrations (recommended)

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations (creates all tables)
npm run prisma:migrate

# Seed the database (creates conditions, roles lookup data)
npm run prisma:seed
```

### Option B — Manual SQL

If you prefer to run raw SQL directly:

```bash
psql -U chw_user -d chw_db -f prisma/migrations/001_init/migration.sql
```

Then seed lookup data manually:
```sql
INSERT INTO conditions (id, name) VALUES
  (gen_random_uuid(), 'HIV'),
  (gen_random_uuid(), 'TB'),
  (gen_random_uuid(), 'Hypertension'),
  (gen_random_uuid(), 'Malaria'),
  (gen_random_uuid(), 'Typhoid'),
  (gen_random_uuid(), 'Diabetes'),
  (gen_random_uuid(), 'Other');

INSERT INTO roles (id, name) VALUES
  (gen_random_uuid(), 'admin'),
  (gen_random_uuid(), 'health_worker');
```

---

## Running the App

```bash
# Development (hot reload)
npm run dev

# Production build
npm run build
npm start

# View DB in Prisma Studio (GUI)
npm run prisma:studio
```

You should see:
```
CHW Backend running on port 3000 [development]
```

Verify it's working:
```bash
curl http://localhost:3000/health
# → {"success":true,"data":{"status":"healthy","timestamp":"..."}}
```

---

## API Reference

All endpoints are prefixed with `/api/v1/`. All responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "pagination": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

Error responses:
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

---

### Authentication (`/api/v1/auth`)

#### POST /api/v1/auth/signup
Register a new health worker.

```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Kamau",
    "email": "jane.kamau@health.ke",
    "password": "securepassword123",
    "phone": "+254712345678",
    "role": "health_worker"
  }'
```

Response `201`:
```json
{
  "success": true,
  "message": "Health worker registered successfully",
  "data": {
    "worker": { "id": "uuid", "name": "Jane Kamau", "email": "jane.kamau@health.ke", "role": "health_worker" },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST /api/v1/auth/login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "jane.kamau@health.ke", "password": "securepassword123" }'
```

#### GET /api/v1/auth/me
Get current authenticated worker's profile. Requires Bearer token.

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### Dashboard (`/api/v1/dashboard`)

#### GET /api/v1/dashboard
Returns aggregated stats for dashboard cards. Requires auth.

```bash
curl http://localhost:3000/api/v1/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalPatients": 142,
      "atRiskPatients": 18,
      "patientsNeedingFollowUp": 7,
      "patientsWithMissedMedication": 12,
      "visitsThisWeek": 34,
      "unreadNotifications": 5
    },
    "conditionBreakdown": [
      { "condition": "Hypertension", "count": 45 },
      { "condition": "HIV", "count": 38 }
    ],
    "alerts": {
      "overdueVisitCount": 7,
      "atRiskCount": 18,
      "missedMedicationCount": 12
    }
  }
}
```

---

### Patients (`/api/v1/patients`)

#### POST /api/v1/patients
Create a new patient. Auto-generates a unique patient code (e.g., `CHW-LK3M9X-A4F2`).

```bash
curl -X POST http://localhost:3000/api/v1/patients \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mary Wanjiku",
    "age": 34,
    "gender": "female",
    "location": "Kibera, Nairobi",
    "phone": "+254700111222",
    "conditions": ["Hypertension", "HIV"]
  }'
```

#### GET /api/v1/patients
List patients with filtering and pagination.

```bash
# All patients
curl "http://localhost:3000/api/v1/patients" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by condition
curl "http://localhost:3000/api/v1/patients?condition=HIV&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter at-risk patients
curl "http://localhost:3000/api/v1/patients?isAtRisk=true" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search by name or patient code
curl "http://localhost:3000/api/v1/patients?search=Mary" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by location
curl "http://localhost:3000/api/v1/patients?location=Kibera" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### GET /api/v1/patients/:id
Get full patient profile (conditions, medications, recent visits, medical records, notes).

```bash
curl "http://localhost:3000/api/v1/patients/PATIENT_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### PATCH /api/v1/patients/:id
Update patient profile (all fields optional).

```bash
curl -X PATCH "http://localhost:3000/api/v1/patients/PATIENT_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "age": 35, "location": "Mathare, Nairobi" }'
```

#### DELETE /api/v1/patients/:id
Soft delete (admin only). Sets `deleted_at` — does not remove from database.

```bash
curl -X DELETE "http://localhost:3000/api/v1/patients/PATIENT_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### PATCH /api/v1/patients/:id/at-risk
Mark or unmark a patient as at-risk.

```bash
curl -X PATCH "http://localhost:3000/api/v1/patients/PATIENT_UUID/at-risk" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "isAtRisk": true }'
```

---

### Visits (`/api/v1/visits`)

#### POST /api/v1/visits
Log a visit with optional measurements. If `medicationAdherence: false`, the patient is automatically flagged at-risk and a notification + SMS log entry is created.

```bash
curl -X POST http://localhost:3000/api/v1/visits \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PATIENT_UUID",
    "visitDate": "2025-01-15T09:00:00Z",
    "notes": "Patient reports improved energy levels. Adherent to ARV regimen.",
    "medicationAdherence": true,
    "nextVisitDate": "2025-02-15T09:00:00Z",
    "measurements": {
      "systolic": 135,
      "diastolic": 88,
      "weight": 62.5,
      "temperature": 36.8,
      "oxygenSat": 98
    }
  }'
```

#### GET /api/v1/visits/patient/:patientId
Get visit history for a patient.

```bash
curl "http://localhost:3000/api/v1/visits/patient/PATIENT_UUID?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### POST /api/v1/visits/medical-records
Add a medical record (HIV viral load, TB status, malaria test result, etc.).

```bash
curl -X POST http://localhost:3000/api/v1/visits/medical-records \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PATIENT_UUID",
    "recordType": "hiv_monitoring",
    "hivViralLoad": 250,
    "hivTestDate": "2025-01-10T00:00:00Z",
    "hivTestResult": "detectable",
    "arvRegimen": "TDF/3TC/DTG",
    "notes": "Viral load elevated, counseling provided"
  }'
```

```bash
# TB record
curl -X POST http://localhost:3000/api/v1/visits/medical-records \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PATIENT_UUID",
    "recordType": "tb_screening",
    "tbStatus": "positive",
    "notes": "Referred to clinic for GeneXpert confirmation"
  }'
```

#### GET /api/v1/visits/medical-records/:patientId
```bash
curl "http://localhost:3000/api/v1/visits/medical-records/PATIENT_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### POST /api/v1/visits/notes/:patientId
Add a note to a patient's record.

```bash
curl -X POST "http://localhost:3000/api/v1/visits/notes/PATIENT_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "content": "Patient requested referral to nutritionist. Struggling with diet due to ARV side effects." }'
```

---

### Notifications (`/api/v1/notifications`)

#### GET /api/v1/notifications
List notifications for the authenticated worker.

```bash
# All notifications
curl "http://localhost:3000/api/v1/notifications" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Unread only
curl "http://localhost:3000/api/v1/notifications?unread=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### PATCH /api/v1/notifications/:id/read
```bash
curl -X PATCH "http://localhost:3000/api/v1/notifications/NOTIF_UUID/read" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### PATCH /api/v1/notifications/read-all
```bash
curl -X PATCH "http://localhost:3000/api/v1/notifications/read-all" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### POST /api/v1/notifications/check-missed-visits
Admin-only. Scans all patients with overdue next visit dates, creates notifications, and marks them at-risk.

```bash
curl -X POST "http://localhost:3000/api/v1/notifications/check-missed-visits" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## Project Structure

```
chw-backend/
├── prisma/
│   ├── schema.prisma              # Database schema (source of truth)
│   └── migrations/
│       └── 001_init/migration.sql # Raw SQL migration
├── src/
│   ├── index.ts                   # Express app entry point
│   ├── config/
│   │   ├── database.ts            # Prisma client singleton
│   │   └── env.ts                 # Typed environment variable loader
│   ├── middleware/
│   │   ├── auth.ts                # JWT authentication + role guard
│   │   └── errorHandler.ts        # Global error handler + 404 handler
│   ├── modules/                   # Feature-based modules
│   │   ├── auth/
│   │   │   ├── auth.schema.ts     # Zod validation schemas
│   │   │   ├── auth.service.ts    # Business logic (signup, login, JWT)
│   │   │   ├── auth.controller.ts # Request/response handlers
│   │   │   └── auth.routes.ts     # Route definitions
│   │   ├── patients/              # Patient CRUD, soft delete, at-risk
│   │   ├── visits/                # Visit logging, measurements, records
│   │   ├── notifications/         # Notification CRUD, SMS trigger log
│   │   └── dashboard/             # Aggregated stats
│   ├── routes/
│   │   └── index.ts               # Mounts all module routes under /api/v1
│   ├── types/
│   │   └── index.ts               # Shared TypeScript interfaces
│   └── utils/
│       ├── response.ts            # Consistent API response helpers
│       ├── pagination.ts          # Query param → pagination object
│       ├── patientCode.ts         # Auto-generate unique patient codes
│       └── seed.ts                # Database seeder
├── .env.example                   # Environment variable template
├── package.json
├── tsconfig.json
└── README.md
```

### Layer Responsibilities

| Layer | Purpose |
|-------|---------|
| `config/` | Environment variables, database connection — no business logic |
| `middleware/` | JWT auth guard, role enforcement, error normalization |
| `modules/*/schema.ts` | Zod validation — input shape and constraints |
| `modules/*/service.ts` | Business logic — queries, transactions, domain rules |
| `modules/*/controller.ts` | Thin handlers — parse request, call service, send response |
| `modules/*/routes.ts` | Route declarations — wires path + middleware + controller |
| `utils/` | Pure helpers with no dependencies on modules |
| `types/` | Shared TypeScript interfaces used across layers |

---

## Database Schema (ERD)

### Entity Relationships

```
roles (1) ──────────────────── (N) health_workers
health_workers (1) ─────────── (N) visits
health_workers (1) ─────────── (N) notifications

patients (1) ───────────────── (N) visits
patients (1) ───────────────── (N) medical_records
patients (1) ───────────────── (N) notifications
patients (1) ───────────────── (N) notes
patients (M) ───────────────── (M) conditions  [via patient_conditions]
patients (M) ───────────────── (M) medications [via patient_medications]

visits (1) ─────────────────── (N) measurements
```

### Key Design Decisions

**UUIDs for all primary keys** — avoids sequential ID leakage, supports future distributed/offline sync.

**Soft deletes on `patients`** — healthcare data must never be hard-deleted. The `deleted_at` column is indexed so active-patient queries are fast (`WHERE deleted_at IS NULL`).

**`sync_status` enum** — added to `patients`, `visits`, and `health_workers` now to support future offline-first sync without a schema migration. Values: `synced`, `pending`, `conflict`.

**`patient_conditions` junction table** — normalized many-to-many between patients and their conditions. Allows adding `diagnosed_at` metadata per condition.

**`measurements` as a child of `visits`** — vital signs are always recorded in the context of a visit, never standalone.

**SMS simulation via `sms_log`** — the `notifications` table has `sms_triggered` and `sms_log` fields. No external SMS provider is integrated, but the trigger event is logged so a real provider (e.g., Africa's Talking) can be wired in by processing undelivered log entries.

**`isAtRisk` flag on patients** — auto-set when medication adherence is false or a visit is overdue. This drives dashboard alerts and can be extended to push notifications.

---

## Design Decisions

### Offline-First Readiness
The system is not fully offline-capable yet, but is structured to support it:
- All records include `updated_at` timestamps for delta sync
- `sync_status` column exists on key tables (`pending` = locally created, not yet synced)
- UUIDs prevent ID collisions when devices sync independently
- No auto-increment sequences that would conflict on merge

### Security
- Passwords are hashed with bcrypt (cost factor 12)
- JWT tokens are stateless and short-lived (7d default)
- Rate limiting (100 req/15min) applied to all `/api/` routes
- CORS restricted to a configured origin
- Soft deletes ensure audit trail is never lost

### Error Handling
All errors funnel through the global `errorHandler` middleware which:
- Converts Zod validation errors to readable 422 responses
- Converts Prisma constraint errors (duplicate, not found) to HTTP-appropriate codes
- Never leaks stack traces to clients
