# AfyaFlow — Implementation Guide & Code Conventions

> **Purpose**: This document is a complete specification for building the AfyaFlow backend and frontend. Hand this to an LLM or developer and they should be able to scaffold and implement the entire project from scratch.

---

## 1. PROJECT OVERVIEW

**AfyaFlow** is a Smart Hospital Flow & Patient Management System built for the Safaricom Intern Hackathon 2026 (HealthTech & Wellbeing Track).

**Core value proposition**: Digitize the end-to-end patient journey — from check-in through triage, consultation, lab, pharmacy, billing, and discharge — with real-time queue management, unified patient records, and integrated M-Pesa payments.

**Tech stack**: Node.js + TypeScript backend, React + TypeScript frontend, PostgreSQL database, Daraja 3.0 (M-Pesa sandbox) for payments.

---

## 2. REQUIREMENTS SPECIFICATION

### 2.1 Functional Requirements

#### FR-01: Patient Registration & Check-In
- FR-01.1: Register new patients with demographics (name, phone, ID number, gender, DOB, next of kin, insurance details)
- FR-01.2: Support multi-channel check-in: web app, QR code scan, USSD simulation
- FR-01.3: Detect returning patients via phone number or national ID lookup
- FR-01.4: Generate a unique visit token per check-in (e.g., `VIS-20260422-0001`)
- FR-01.5: Auto-assign patient to the triage queue upon successful check-in

#### FR-02: Real-Time Queue Management
- FR-02.1: Maintain separate queues per department: Triage, Consultation, Lab, Pharmacy, Billing
- FR-02.2: Display live queue position and estimated wait time per patient
- FR-02.3: Auto-route patients to the next department when the current step is completed
- FR-02.4: Allow department staff to call the next patient, skip, or re-queue
- FR-02.5: Emit real-time updates via WebSocket (Socket.io) to all connected dashboards
- FR-02.6: Support priority flagging (emergency, elderly, pregnant) with queue bypass

#### FR-03: Unified Patient Records (Lightweight EMR)
- FR-03.1: Store per-visit clinical data: vitals, symptoms, diagnosis, prescriptions, lab requests, lab results
- FR-03.2: Provide read-only access to historical visits for any authenticated department user
- FR-03.3: All departments see the same patient record in real time
- FR-03.4: Records are append-only — no deletion of clinical data, only soft-delete

#### FR-04: Departmental Workflows
- FR-04.1 **Triage**: Nurse logs vitals (temperature, blood pressure, pulse, weight, oxygen saturation) and assigns urgency level (1-5)
- FR-04.2 **Consultation**: Doctor views triage notes, records diagnosis (free text + ICD-10 code optional), creates lab requests and/or prescriptions, marks consultation complete
- FR-04.3 **Lab**: Lab tech receives digital requests, logs specimen collection, enters results, marks complete
- FR-04.4 **Pharmacy**: Pharmacist receives prescriptions, marks each item as dispensed or out-of-stock, marks complete
- FR-04.5 **Billing**: Auto-generates itemized bill from consultation, lab, and pharmacy charges. Triggers M-Pesa payment. Marks as paid on successful callback
- FR-04.6: Each department has a filtered dashboard showing only their queue and relevant patient data

#### FR-05: M-Pesa Payments (Daraja 3.0 Sandbox)
- FR-05.1: Generate itemized bill per visit: consultation fee, lab test fees, medication fees
- FR-05.2: Initiate STK Push to patient's registered phone number
- FR-05.3: Handle async payment callback — update transaction status (pending → completed / failed)
- FR-05.4: Display payment status in real time on billing dashboard
- FR-05.5: Support payment retry on failure
- FR-05.6: Store full transaction audit trail: amount, phone, reference, timestamp, M-Pesa receipt number, status
- FR-05.7: All transactions MUST use Daraja sandbox — no real money
- FR-05.8: Generate payment confirmation (displayable receipt with visit details and M-Pesa receipt number)

#### FR-06: Patient Engagement (Simulated)
- FR-06.1: Log SMS notifications for: queue position alerts, appointment reminders, post-visit follow-up
- FR-06.2: SMS sending can be simulated (logged to console/DB) — no real SMS gateway required for demo

#### FR-07: Authentication & Authorization
- FR-07.1: Role-based access control with roles: `receptionist`, `nurse`, `doctor`, `lab_tech`, `pharmacist`, `billing_officer`, `admin`
- FR-07.2: JWT-based authentication with access + refresh token pattern
- FR-07.3: Each role sees only their relevant dashboard and actions
- FR-07.4: Admin can manage users and view all dashboards

### 2.2 Non-Functional Requirements

#### NFR-01: Performance & Rate Limiting
- NFR-01.1: API response time < 500ms for all CRUD operations
- NFR-01.2: Global rate limiting: 100 requests/minute per IP
- NFR-01.3: Auth endpoint rate limiting: 10 requests/minute per IP (brute-force protection)
- NFR-01.4: M-Pesa callback endpoint: no rate limit (must always accept Safaricom callbacks)
- NFR-01.5: WebSocket connections limited to 50 concurrent per server instance

#### NFR-02: Security
- NFR-02.1: All passwords hashed with bcrypt (min 12 rounds)
- NFR-02.2: JWT secrets stored in environment variables, never hardcoded
- NFR-02.3: Daraja consumer key, consumer secret, passkey in environment variables
- NFR-02.4: Input validation on every endpoint using Zod schemas
- NFR-02.5: SQL injection prevention via parameterized queries (Prisma ORM)
- NFR-02.6: CORS restricted to known frontend origins
- NFR-02.7: Helmet.js for HTTP security headers
- NFR-02.8: Request body size limit: 1MB

#### NFR-03: Responsiveness
- NFR-03.1: Mobile-first responsive design (min 320px width)
- NFR-03.2: Tablet-friendly layout for reception/triage desks
- NFR-03.3: Desktop layout for admin and department dashboards

#### NFR-04: Data Privacy (Kenya Data Protection Act 2019)
- NFR-04.1: All demo data must be synthetic — no real patient information
- NFR-04.2: Patient data accessible only to authenticated, authorized roles
- NFR-04.3: Audit log for all data access (who viewed/modified which record, when)
- NFR-04.4: Mention compliance approach in technical brief

#### NFR-05: Accessibility & Inclusion
- NFR-05.1: USSD flow simulation for patient check-in
- NFR-05.2: Kiswahili / English language toggle on patient-facing screens
- NFR-05.3: High-contrast mode, large touch targets (min 44px), semantic HTML
- NFR-05.4: Screen reader compatible (ARIA labels on interactive elements)

---

## 3. PROJECT STRUCTURE

```
afyaflow/
├── package.json
├── tsconfig.json
├── .env.example
├── .env
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                     # Demo data seeder
├── src/
│   ├── server.ts                   # Entry point — bootstraps Express + Socket.io
│   ├── app.ts                      # Express app configuration (middleware stack)
│   ├── config/
│   │   ├── index.ts                # Centralized config from env vars
│   │   ├── database.ts             # Prisma client singleton
│   │   └── socket.ts               # Socket.io server instance
│   ├── interfaces/
│   │   ├── patient.interface.ts
│   │   ├── visit.interface.ts
│   │   ├── queue.interface.ts
│   │   ├── billing.interface.ts
│   │   ├── payment.interface.ts
│   │   ├── user.interface.ts
│   │   ├── auth.interface.ts
│   │   ├── clinical.interface.ts
│   │   └── common.interface.ts     # Shared types: pagination, API response envelope, etc.
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.validation.ts  # Zod schemas
│   │   │   └── auth.middleware.ts   # JWT verification, role guard
│   │   ├── patient/
│   │   │   ├── patient.controller.ts
│   │   │   ├── patient.service.ts
│   │   │   ├── patient.routes.ts
│   │   │   └── patient.validation.ts
│   │   ├── visit/
│   │   │   ├── visit.controller.ts
│   │   │   ├── visit.service.ts
│   │   │   ├── visit.routes.ts
│   │   │   └── visit.validation.ts
│   │   ├── queue/
│   │   │   ├── queue.controller.ts
│   │   │   ├── queue.service.ts
│   │   │   ├── queue.routes.ts
│   │   │   ├── queue.validation.ts
│   │   │   └── queue.gateway.ts    # Socket.io event handlers
│   │   ├── triage/
│   │   │   ├── triage.controller.ts
│   │   │   ├── triage.service.ts
│   │   │   ├── triage.routes.ts
│   │   │   └── triage.validation.ts
│   │   ├── consultation/
│   │   │   ├── consultation.controller.ts
│   │   │   ├── consultation.service.ts
│   │   │   ├── consultation.routes.ts
│   │   │   └── consultation.validation.ts
│   │   ├── lab/
│   │   │   ├── lab.controller.ts
│   │   │   ├── lab.service.ts
│   │   │   ├── lab.routes.ts
│   │   │   └── lab.validation.ts
│   │   ├── pharmacy/
│   │   │   ├── pharmacy.controller.ts
│   │   │   ├── pharmacy.service.ts
│   │   │   ├── pharmacy.routes.ts
│   │   │   └── pharmacy.validation.ts
│   │   ├── billing/
│   │   │   ├── billing.controller.ts
│   │   │   ├── billing.service.ts
│   │   │   ├── billing.routes.ts
│   │   │   └── billing.validation.ts
│   │   └── payment/
│   │       ├── payment.controller.ts
│   │       ├── payment.service.ts  # Daraja 3.0 integration
│   │       ├── payment.routes.ts
│   │       └── payment.validation.ts
│   ├── middleware/
│   │   ├── rateLimiter.ts          # express-rate-limit config
│   │   ├── errorHandler.ts         # Global error handler
│   │   ├── validate.ts             # Zod validation middleware factory
│   │   ├── audit.ts                # Audit logging middleware
│   │   └── notFound.ts             # 404 handler
│   ├── utils/
│   │   ├── logger.ts               # Winston logger
│   │   ├── apiResponse.ts          # Standardized response helpers
│   │   ├── tokenGenerator.ts       # Visit token, receipt number generators
│   │   ├── daraja.ts               # Daraja API client (auth, STK push, query)
│   │   └── errors.ts               # Custom error classes (AppError, NotFoundError, etc.)
│   └── types/
│       └── express.d.ts            # Express Request augmentation (req.user, etc.)
├── tests/
│   ├── unit/
│   └── integration/
└── client/                         # React frontend (separate README)
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── api/                    # Axios instance + API service functions
    │   ├── hooks/                  # Custom hooks (useAuth, useQueue, useSocket)
    │   ├── context/                # AuthContext, SocketContext
    │   ├── components/             # Shared UI components
    │   ├── pages/                  # Route-level pages per role
    │   │   ├── Login.tsx
    │   │   ├── Reception.tsx
    │   │   ├── Triage.tsx
    │   │   ├── Consultation.tsx
    │   │   ├── Lab.tsx
    │   │   ├── Pharmacy.tsx
    │   │   ├── Billing.tsx
    │   │   └── Admin.tsx
    │   └── types/                  # Shared TypeScript types (mirrors backend interfaces)
    └── index.html
```

---

## 4. TYPESCRIPT INTERFACES

All interfaces go in `src/interfaces/`. These are the source of truth for data shapes across the entire app.

### 4.1 common.interface.ts

```typescript
// ---- Enums ----

export enum UserRole {
  RECEPTIONIST = 'receptionist',
  NURSE = 'nurse',
  DOCTOR = 'doctor',
  LAB_TECH = 'lab_tech',
  PHARMACIST = 'pharmacist',
  BILLING_OFFICER = 'billing_officer',
  ADMIN = 'admin',
}

export enum Department {
  RECEPTION = 'reception',
  TRIAGE = 'triage',
  CONSULTATION = 'consultation',
  LAB = 'lab',
  PHARMACY = 'pharmacy',
  BILLING = 'billing',
}

export enum QueueStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

export enum Priority {
  NORMAL = 'normal',
  HIGH = 'high',         // elderly, pregnant
  EMERGENCY = 'emergency',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum VisitStatus {
  ACTIVE = 'active',
  DISCHARGED = 'discharged',
  CANCELLED = 'cancelled',
}

export enum UrgencyLevel {
  NON_URGENT = 1,
  SEMI_URGENT = 2,
  URGENT = 3,
  VERY_URGENT = 4,
  EMERGENCY = 5,
}

export enum LabRequestStatus {
  REQUESTED = 'requested',
  SPECIMEN_COLLECTED = 'specimen_collected',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PrescriptionItemStatus {
  PENDING = 'pending',
  DISPENSED = 'dispensed',
  OUT_OF_STOCK = 'out_of_stock',
}

// ---- Shared Types ----

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface AuditEntry {
  id: string;
  userId: string;
  action: string;          // e.g., 'PATIENT_VIEWED', 'VISIT_CREATED', 'PAYMENT_INITIATED'
  resourceType: string;    // e.g., 'Patient', 'Visit', 'Payment'
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress: string;
  createdAt: Date;
}
```

### 4.2 user.interface.ts

```typescript
import { UserRole } from './common.interface';

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  department: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  department: string;
}

export interface IUpdateUser {
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
  department?: string;
  isActive?: boolean;
}
```

### 4.3 auth.interface.ts

```typescript
import { UserRole } from './common.interface';

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface ITokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  department: string;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;         // seconds
}

export interface IRefreshTokenRequest {
  refreshToken: string;
}

export interface IAuthenticatedRequest extends Express.Request {
  user: ITokenPayload;
}
```

### 4.4 patient.interface.ts

```typescript
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export interface IPatient {
  id: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  phone: string;
  email?: string;
  address?: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreatePatient {
  nationalId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;       // ISO date string, parsed on server
  gender: Gender;
  phone: string;
  email?: string;
  address?: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
}

export interface IPatientSearch {
  phone?: string;
  nationalId?: string;
  name?: string;
}
```

### 4.5 visit.interface.ts

```typescript
import { VisitStatus, Priority } from './common.interface';

export interface IVisit {
  id: string;
  visitToken: string;         // e.g., "VIS-20260422-0001"
  patientId: string;
  checkInTime: Date;
  dischargeTime?: Date;
  status: VisitStatus;
  priority: Priority;
  currentDepartment: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateVisit {
  patientId: string;
  priority?: Priority;
  notes?: string;
}
```

### 4.6 queue.interface.ts

```typescript
import { Department, QueueStatus, Priority } from './common.interface';

export interface IQueueEntry {
  id: string;
  visitId: string;
  patientId: string;
  department: Department;
  position: number;
  status: QueueStatus;
  priority: Priority;
  estimatedWaitMinutes: number;
  calledAt?: Date;
  completedAt?: Date;
  assignedToUserId?: string;   // staff member handling this patient
  createdAt: Date;
  updatedAt: Date;
}

export interface IQueueAction {
  queueEntryId: string;
  action: 'call_next' | 'complete' | 'skip' | 'requeue';
  notes?: string;
}

// Socket.io event payloads
export interface IQueueUpdateEvent {
  department: Department;
  entries: IQueueEntry[];
  timestamp: Date;
}

export interface IPatientCalledEvent {
  visitId: string;
  patientName: string;
  department: Department;
  position: number;
}
```

### 4.7 clinical.interface.ts

```typescript
import { UrgencyLevel, LabRequestStatus, PrescriptionItemStatus } from './common.interface';

// ---- Triage ----

export interface ITriageRecord {
  id: string;
  visitId: string;
  nurseId: string;
  temperature: number;        // Celsius
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  pulseRate: number;          // bpm
  oxygenSaturation: number;   // percentage
  weight: number;             // kg
  height?: number;            // cm
  urgencyLevel: UrgencyLevel;
  chiefComplaint: string;
  notes?: string;
  createdAt: Date;
}

export interface ICreateTriageRecord {
  visitId: string;
  temperature: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  pulseRate: number;
  oxygenSaturation: number;
  weight: number;
  height?: number;
  urgencyLevel: UrgencyLevel;
  chiefComplaint: string;
  notes?: string;
}

// ---- Consultation ----

export interface IConsultationRecord {
  id: string;
  visitId: string;
  doctorId: string;
  symptoms: string;
  diagnosis: string;
  icdCode?: string;           // ICD-10 code (optional)
  treatmentPlan: string;
  notes?: string;
  requiresLab: boolean;
  requiresPharmacy: boolean;
  createdAt: Date;
}

export interface ICreateConsultationRecord {
  visitId: string;
  symptoms: string;
  diagnosis: string;
  icdCode?: string;
  treatmentPlan: string;
  notes?: string;
  labRequests?: ICreateLabRequest[];
  prescriptions?: ICreatePrescriptionItem[];
}

// ---- Lab ----

export interface ILabRequest {
  id: string;
  visitId: string;
  requestedByDoctorId: string;
  testName: string;
  testCode?: string;
  instructions?: string;
  status: LabRequestStatus;
  results?: string;
  resultNotes?: string;
  processedByTechId?: string;
  fee: number;                // in KES
  requestedAt: Date;
  completedAt?: Date;
}

export interface ICreateLabRequest {
  testName: string;
  testCode?: string;
  instructions?: string;
  fee: number;
}

export interface IUpdateLabResult {
  labRequestId: string;
  status: LabRequestStatus;
  results?: string;
  resultNotes?: string;
}

// ---- Pharmacy ----

export interface IPrescriptionItem {
  id: string;
  visitId: string;
  prescribedByDoctorId: string;
  medicationName: string;
  dosage: string;             // e.g., "500mg"
  frequency: string;          // e.g., "3x daily"
  duration: string;           // e.g., "7 days"
  quantity: number;
  status: PrescriptionItemStatus;
  dispensedByPharmacistId?: string;
  fee: number;                // in KES
  prescribedAt: Date;
  dispensedAt?: Date;
}

export interface ICreatePrescriptionItem {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  fee: number;
}

export interface IUpdatePrescriptionStatus {
  prescriptionItemId: string;
  status: PrescriptionItemStatus;
}
```

### 4.8 billing.interface.ts

```typescript
import { PaymentStatus } from './common.interface';

export interface IBillItem {
  id: string;
  billId: string;
  description: string;        // e.g., "Consultation Fee", "CBC Test", "Amoxicillin 500mg x 21"
  category: 'consultation' | 'lab' | 'pharmacy' | 'other';
  amount: number;             // KES
  createdAt: Date;
}

export interface IBill {
  id: string;
  visitId: string;
  patientId: string;
  items: IBillItem[];
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: PaymentStatus;
  generatedAt: Date;
  paidAt?: Date;
}

export interface IGenerateBill {
  visitId: string;
  consultationFee?: number;   // default from config if not provided
}
```

### 4.9 payment.interface.ts

```typescript
import { PaymentStatus } from './common.interface';

export interface IPaymentTransaction {
  id: string;
  billId: string;
  visitId: string;
  patientId: string;
  phone: string;
  amount: number;
  mpesaReceiptNumber?: string;
  merchantRequestId: string;
  checkoutRequestId: string;
  resultCode?: number;
  resultDescription?: string;
  status: PaymentStatus;
  initiatedAt: Date;
  completedAt?: Date;
}

export interface IStkPushRequest {
  billId: string;
  phone: string;              // format: 2547XXXXXXXX
  amount: number;
}

export interface IStkPushResponse {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

// Daraja callback payload shape
export interface IDarajaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

export interface IPaymentReceipt {
  visitToken: string;
  patientName: string;
  items: Array<{ description: string; amount: number }>;
  totalAmount: number;
  mpesaReceiptNumber: string;
  paidAt: Date;
}
```

---

## 5. CODE CONVENTIONS & STANDARDS

### 5.1 General Principles

- **Single Responsibility**: Each file does one thing. Controllers handle HTTP, services handle business logic, validation files handle schemas.
- **Dependency Injection**: Services receive dependencies (Prisma client, other services) through constructor parameters or module-level singletons.
- **No business logic in controllers**: Controllers only parse the request, call the service, and format the response. All logic lives in services.
- **Fail fast**: Validate input at the boundary (controller layer via Zod). Services can assume valid input.
- **Explicit over implicit**: No magic. If a function does something, its name says so. No `handleStuff()`.

### 5.2 Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | `camelCase.purpose.ts` | `patient.controller.ts`, `queue.gateway.ts` |
| Interfaces | `I` prefix + PascalCase | `IPatient`, `ICreateVisit` |
| Enums | PascalCase, values UPPER_SNAKE | `enum QueueStatus { WAITING = 'waiting' }` |
| Classes | PascalCase | `PatientService`, `AppError` |
| Functions | camelCase, verb-first | `createPatient()`, `getQueueByDepartment()` |
| Constants | UPPER_SNAKE_CASE | `MAX_QUEUE_SIZE`, `DEFAULT_CONSULTATION_FEE` |
| Route params | kebab-case in URLs | `/api/v1/lab-requests/:id/results` |
| DB columns | snake_case (Prisma maps automatically) | `created_at`, `visit_token` |
| Environment vars | UPPER_SNAKE_CASE | `DATABASE_URL`, `DARAJA_CONSUMER_KEY` |
| Boolean variables | `is`/`has`/`should` prefix | `isActive`, `hasInsurance`, `shouldNotify` |

### 5.3 File Structure Convention (per module)

Every module follows this pattern:

```
module/
├── module.controller.ts    # HTTP handlers — parse request, call service, send response
├── module.service.ts       # Business logic — all DB queries, computations, orchestration
├── module.routes.ts        # Express Router — maps HTTP methods to controller methods
├── module.validation.ts    # Zod schemas — request body, params, and query validation
└── module.gateway.ts       # (optional) Socket.io event handlers for real-time features
```

### 5.4 Controller Pattern

```typescript
// Example: patient.controller.ts

import { Request, Response, NextFunction } from 'express';
import { PatientService } from './patient.service';
import { ApiResponse } from '../../interfaces/common.interface';

export class PatientController {
  constructor(private patientService: PatientService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const patient = await this.patientService.create(req.body);
      const response: ApiResponse = {
        success: true,
        message: 'Patient registered successfully',
        data: patient,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);  // Always forward to global error handler
    }
  };

  findByPhone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const patient = await this.patientService.findByPhone(req.params.phone);
      const response: ApiResponse = {
        success: true,
        message: patient ? 'Patient found' : 'No patient found',
        data: patient,
      };
      res.status(patient ? 200 : 404).json(response);
    } catch (error) {
      next(error);
    }
  };
}
```

### 5.5 Service Pattern

```typescript
// Example: patient.service.ts

import { PrismaClient } from '@prisma/client';
import { ICreatePatient, IPatient, IPatientSearch } from '../../interfaces/patient.interface';
import { NotFoundError, ConflictError } from '../../utils/errors';

export class PatientService {
  constructor(private prisma: PrismaClient) {}

  async create(data: ICreatePatient): Promise<IPatient> {
    const existing = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { nationalId: data.nationalId },
          { phone: data.phone },
        ],
      },
    });

    if (existing) {
      throw new ConflictError('Patient with this ID or phone already exists');
    }

    return this.prisma.patient.create({ data });
  }

  async findByPhone(phone: string): Promise<IPatient | null> {
    return this.prisma.patient.findUnique({ where: { phone } });
  }

  async findById(id: string): Promise<IPatient> {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundError('Patient not found');
    return patient;
  }
}
```

### 5.6 Validation Pattern (Zod)

```typescript
// Example: patient.validation.ts

import { z } from 'zod';
import { Gender } from '../../interfaces/patient.interface';

export const createPatientSchema = z.object({
  body: z.object({
    nationalId: z.string().min(6).max(20),
    firstName: z.string().min(1).max(100).trim(),
    lastName: z.string().min(1).max(100).trim(),
    dateOfBirth: z.string().datetime({ message: 'Must be a valid ISO date' }),
    gender: z.nativeEnum(Gender),
    phone: z.string().regex(/^2547\d{8}$/, 'Phone must be in format 2547XXXXXXXX'),
    email: z.string().email().optional(),
    address: z.string().max(500).optional(),
    nextOfKinName: z.string().min(1).max(200),
    nextOfKinPhone: z.string().regex(/^2547\d{8}$/),
    insuranceProvider: z.string().max(100).optional(),
    insuranceNumber: z.string().max(50).optional(),
  }),
});

export const searchPatientSchema = z.object({
  query: z.object({
    phone: z.string().optional(),
    nationalId: z.string().optional(),
    name: z.string().optional(),
  }).refine(
    (data) => data.phone || data.nationalId || data.name,
    { message: 'At least one search parameter required' }
  ),
});
```

### 5.7 Route Pattern

```typescript
// Example: patient.routes.ts

import { Router } from 'express';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { authenticate, authorize } from '../auth/auth.middleware';
import { validate } from '../../middleware/validate';
import { createPatientSchema, searchPatientSchema } from './patient.validation';
import { UserRole } from '../../interfaces/common.interface';
import prisma from '../../config/database';

const router = Router();
const service = new PatientService(prisma);
const controller = new PatientController(service);

router.post(
  '/',
  authenticate,
  authorize([UserRole.RECEPTIONIST, UserRole.ADMIN]),
  validate(createPatientSchema),
  controller.create
);

router.get(
  '/search',
  authenticate,
  validate(searchPatientSchema),
  controller.findByPhone
);

export default router;
```

### 5.8 Validation Middleware Factory

```typescript
// src/middleware/validate.ts

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!errors[path]) errors[path] = [];
          errors[path].push(err.message);
        });
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
        return;
      }
      next(error);
    }
  };
};
```

---

## 6. RATE LIMITING & THROTTLING

### 6.1 Configuration

```typescript
// src/middleware/rateLimiter.ts

import rateLimit from 'express-rate-limit';

// Global rate limiter — all routes
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,          // 1 minute window
  max: 100,                      // 100 requests per window per IP
  standardHeaders: true,         // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again in a minute.',
  },
});

// Strict limiter for auth endpoints — brute-force protection
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in a minute.',
  },
});

// STK Push limiter — prevent accidental double-charges
export const paymentLimiter = rateLimit({
  windowMs: 30 * 1000,          // 30 second window
  max: 3,                        // 3 payment requests per 30s per IP
  message: {
    success: false,
    message: 'Payment request already in progress. Please wait.',
  },
});

// No rate limit on Daraja callback endpoint — Safaricom must always reach us
// This is handled by NOT applying any limiter to that specific route
```

### 6.2 Application in app.ts

```typescript
// src/app.ts

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { globalLimiter, authLimiter, paymentLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import { auditMiddleware } from './middleware/audit';

// Module routes
import authRoutes from './modules/auth/auth.routes';
import patientRoutes from './modules/patient/patient.routes';
import visitRoutes from './modules/visit/visit.routes';
import queueRoutes from './modules/queue/queue.routes';
import triageRoutes from './modules/triage/triage.routes';
import consultationRoutes from './modules/consultation/consultation.routes';
import labRoutes from './modules/lab/lab.routes';
import pharmacyRoutes from './modules/pharmacy/pharmacy.routes';
import billingRoutes from './modules/billing/billing.routes';
import paymentRoutes from './modules/payment/payment.routes';

const app = express();

// ---- Security middleware ----
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true,
}));

// ---- Body parsing ----
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ---- Global rate limiter ----
app.use('/api/', globalLimiter);

// ---- Audit logging ----
app.use('/api/', auditMiddleware);

// ---- Routes ----
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/visits', visitRoutes);
app.use('/api/v1/queue', queueRoutes);
app.use('/api/v1/triage', triageRoutes);
app.use('/api/v1/consultations', consultationRoutes);
app.use('/api/v1/lab-requests', labRoutes);
app.use('/api/v1/pharmacy', pharmacyRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/payments', paymentLimiter, paymentRoutes);

// Daraja callback — NO rate limiter, NO auth
app.use('/api/v1/payments/callback', paymentRoutes);

// ---- Error handling (must be last) ----
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
```

---

## 7. ERROR HANDLING

### 7.1 Custom Error Classes

```typescript
// src/utils/errors.ts

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Invalid request') {
    super(message, 400);
  }
}

export class PaymentError extends AppError {
  constructor(message = 'Payment processing failed') {
    super(message, 502);
  }
}
```

### 7.2 Global Error Handler

```typescript
// src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ApiResponse } from '../interfaces/common.interface';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    // Operational errors — safe to expose message to client
    logger.warn(`[${err.statusCode}] ${err.message}`, {
      path: req.path,
      method: req.method,
    });

    const response: ApiResponse = {
      success: false,
      message: err.message,
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Programming errors — log full stack, send generic message
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const response: ApiResponse = {
    success: false,
    message: 'An unexpected error occurred',
  };
  res.status(500).json(response);
};
```

---

## 8. DARAJA 3.0 (M-PESA) INTEGRATION

### 8.1 Environment Variables

```env
# .env.example

# Daraja 3.0 Sandbox
DARAJA_CONSUMER_KEY=your_sandbox_consumer_key
DARAJA_CONSUMER_SECRET=your_sandbox_consumer_secret
DARAJA_PASSKEY=your_sandbox_passkey
DARAJA_SHORTCODE=174379
DARAJA_ENV=sandbox
DARAJA_BASE_URL=https://sandbox.safaricom.co.ke
DARAJA_CALLBACK_URL=https://your-ngrok-or-tunnel-url/api/v1/payments/callback

# Use ngrok or localtunnel during hackathon for callback reachability
```

### 8.2 Daraja Client Utility

```typescript
// src/utils/daraja.ts

import axios from 'axios';
import { config } from '../config';
import { logger } from './logger';

class DarajaClient {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  // Get or refresh OAuth token
  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(
      `${config.daraja.consumerKey}:${config.daraja.consumerSecret}`
    ).toString('base64');

    const response = await axios.get(
      `${config.daraja.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${auth}` } }
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // refresh 1min early
    return this.accessToken!;
  }

  // Initiate STK Push
  async stkPush(params: {
    phone: string;
    amount: number;
    accountReference: string;
    transactionDesc: string;
  }): Promise<{
    MerchantRequestID: string;
    CheckoutRequestID: string;
    ResponseCode: string;
    ResponseDescription: string;
    CustomerMessage: string;
  }> {
    const token = await this.getAccessToken();
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, '')
      .slice(0, 14);

    const password = Buffer.from(
      `${config.daraja.shortcode}${config.daraja.passkey}${timestamp}`
    ).toString('base64');

    const response = await axios.post(
      `${config.daraja.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: config.daraja.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.ceil(params.amount),   // Daraja requires integer
        PartyA: params.phone,
        PartyB: config.daraja.shortcode,
        PhoneNumber: params.phone,
        CallBackURL: config.daraja.callbackUrl,
        AccountReference: params.accountReference,
        TransactionDesc: params.transactionDesc,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    logger.info('STK Push initiated', {
      phone: params.phone,
      amount: params.amount,
      checkoutRequestId: response.data.CheckoutRequestID,
    });

    return response.data;
  }

  // Query STK Push status (for polling fallback)
  async queryTransaction(checkoutRequestId: string): Promise<{
    ResultCode: string;
    ResultDesc: string;
  }> {
    const token = await this.getAccessToken();
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, '')
      .slice(0, 14);

    const password = Buffer.from(
      `${config.daraja.shortcode}${config.daraja.passkey}${timestamp}`
    ).toString('base64');

    const response = await axios.post(
      `${config.daraja.baseUrl}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: config.daraja.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data;
  }
}

export const darajaClient = new DarajaClient();
```

### 8.3 Payment Service

```typescript
// src/modules/payment/payment.service.ts  (key methods)

import { PrismaClient } from '@prisma/client';
import { darajaClient } from '../../utils/daraja';
import { IStkPushRequest, IDarajaCallback } from '../../interfaces/payment.interface';
import { PaymentStatus } from '../../interfaces/common.interface';
import { PaymentError, NotFoundError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { io } from '../../config/socket';

export class PaymentService {
  constructor(private prisma: PrismaClient) {}

  async initiateStkPush(data: IStkPushRequest) {
    // 1. Validate the bill exists and is unpaid
    const bill = await this.prisma.bill.findUnique({ where: { id: data.billId } });
    if (!bill) throw new NotFoundError('Bill not found');
    if (bill.status === 'completed') throw new PaymentError('Bill already paid');

    // 2. Check for pending transactions on this bill (prevent duplicates)
    const pending = await this.prisma.paymentTransaction.findFirst({
      where: { billId: data.billId, status: PaymentStatus.PENDING },
    });
    if (pending) throw new PaymentError('A payment is already in progress for this bill');

    // 3. Call Daraja STK Push
    const stkResponse = await darajaClient.stkPush({
      phone: data.phone,
      amount: data.amount,
      accountReference: bill.visitId,
      transactionDesc: `AfyaFlow Bill ${bill.id}`,
    });

    // 4. Store the pending transaction
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        billId: data.billId,
        visitId: bill.visitId,
        patientId: bill.patientId,
        phone: data.phone,
        amount: data.amount,
        merchantRequestId: stkResponse.MerchantRequestID,
        checkoutRequestId: stkResponse.CheckoutRequestID,
        status: PaymentStatus.PENDING,
        initiatedAt: new Date(),
      },
    });

    return transaction;
  }

  async handleCallback(payload: IDarajaCallback) {
    const { stkCallback } = payload.Body;

    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: { checkoutRequestId: stkCallback.CheckoutRequestID },
    });

    if (!transaction) {
      logger.warn('Callback for unknown transaction', { payload });
      return;
    }

    const isSuccess = stkCallback.ResultCode === 0;
    let mpesaReceiptNumber: string | undefined;

    if (isSuccess && stkCallback.CallbackMetadata) {
      const receiptItem = stkCallback.CallbackMetadata.Item.find(
        (item) => item.Name === 'MpesaReceiptNumber'
      );
      mpesaReceiptNumber = receiptItem?.Value as string;
    }

    // Update transaction
    await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: isSuccess ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
        resultCode: stkCallback.ResultCode,
        resultDescription: stkCallback.ResultDesc,
        mpesaReceiptNumber,
        completedAt: new Date(),
      },
    });

    // If successful, update the bill
    if (isSuccess) {
      await this.prisma.bill.update({
        where: { id: transaction.billId },
        data: {
          paidAmount: { increment: transaction.amount },
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(),
        },
      });
    }

    // Emit real-time update to billing dashboard
    io.to(`visit:${transaction.visitId}`).emit('payment:update', {
      visitId: transaction.visitId,
      status: isSuccess ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
      mpesaReceiptNumber,
      amount: transaction.amount,
    });
  }
}
```

---

## 9. WEBSOCKET (SOCKET.IO) SETUP

```typescript
// src/config/socket.ts

import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '../utils/logger';

let io: SocketServer;

export const initializeSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
      credentials: true,
    },
    maxHttpBufferSize: 1e6,           // 1MB max message size
    connectionStateRecovery: {},       // auto-reconnect with missed events
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join department room for real-time queue updates
    socket.on('join:department', (department: string) => {
      socket.join(`department:${department}`);
      logger.info(`Socket ${socket.id} joined department:${department}`);
    });

    // Join visit room for payment status updates
    socket.on('join:visit', (visitId: string) => {
      socket.join(`visit:${visitId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export { io };
```

---

## 10. DATABASE SCHEMA (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id         String   @id @default(uuid())
  email      String   @unique
  password   String
  firstName  String   @map("first_name")
  lastName   String   @map("last_name")
  phone      String
  role       String                             // UserRole enum value
  department String
  isActive   Boolean  @default(true) @map("is_active")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  triageRecords       TriageRecord[]
  consultationRecords ConsultationRecord[]
  labRequestsProcessed LabRequest[]        @relation("ProcessedBy")
  prescriptionsDispensed PrescriptionItem[] @relation("DispensedBy")

  @@map("users")
}

model Patient {
  id                String    @id @default(uuid())
  nationalId        String    @unique @map("national_id")
  firstName         String    @map("first_name")
  lastName          String    @map("last_name")
  dateOfBirth       DateTime  @map("date_of_birth")
  gender            String
  phone             String    @unique
  email             String?
  address           String?
  nextOfKinName     String    @map("next_of_kin_name")
  nextOfKinPhone    String    @map("next_of_kin_phone")
  insuranceProvider String?   @map("insurance_provider")
  insuranceNumber   String?   @map("insurance_number")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  visits             Visit[]
  bills              Bill[]
  paymentTransactions PaymentTransaction[]

  @@map("patients")
}

model Visit {
  id                String    @id @default(uuid())
  visitToken        String    @unique @map("visit_token")
  patientId         String    @map("patient_id")
  checkInTime       DateTime  @default(now()) @map("check_in_time")
  dischargeTime     DateTime? @map("discharge_time")
  status            String    @default("active")         // VisitStatus
  priority          String    @default("normal")          // Priority
  currentDepartment String    @default("triage") @map("current_department")
  notes             String?
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  patient             Patient              @relation(fields: [patientId], references: [id])
  queueEntries        QueueEntry[]
  triageRecord        TriageRecord?
  consultationRecord  ConsultationRecord?
  labRequests         LabRequest[]
  prescriptionItems   PrescriptionItem[]
  bill                Bill?
  paymentTransactions PaymentTransaction[]

  @@map("visits")
}

model QueueEntry {
  id                   String    @id @default(uuid())
  visitId              String    @map("visit_id")
  patientId            String    @map("patient_id")
  department           String                              // Department
  position             Int
  status               String    @default("waiting")       // QueueStatus
  priority             String    @default("normal")        // Priority
  estimatedWaitMinutes Int       @default(15) @map("estimated_wait_minutes")
  calledAt             DateTime? @map("called_at")
  completedAt          DateTime? @map("completed_at")
  assignedToUserId     String?   @map("assigned_to_user_id")
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")

  visit Visit @relation(fields: [visitId], references: [id])

  @@unique([visitId, department])
  @@index([department, status])
  @@map("queue_entries")
}

model TriageRecord {
  id                     String   @id @default(uuid())
  visitId                String   @unique @map("visit_id")
  nurseId                String   @map("nurse_id")
  temperature            Float
  bloodPressureSystolic  Int      @map("bp_systolic")
  bloodPressureDiastolic Int      @map("bp_diastolic")
  pulseRate              Int      @map("pulse_rate")
  oxygenSaturation       Float    @map("oxygen_saturation")
  weight                 Float
  height                 Float?
  urgencyLevel           Int      @map("urgency_level")     // 1-5
  chiefComplaint         String   @map("chief_complaint")
  notes                  String?
  createdAt              DateTime @default(now()) @map("created_at")

  visit Visit @relation(fields: [visitId], references: [id])
  nurse User  @relation(fields: [nurseId], references: [id])

  @@map("triage_records")
}

model ConsultationRecord {
  id              String   @id @default(uuid())
  visitId         String   @unique @map("visit_id")
  doctorId        String   @map("doctor_id")
  symptoms        String
  diagnosis       String
  icdCode         String?  @map("icd_code")
  treatmentPlan   String   @map("treatment_plan")
  notes           String?
  requiresLab     Boolean  @default(false) @map("requires_lab")
  requiresPharmacy Boolean @default(false) @map("requires_pharmacy")
  createdAt       DateTime @default(now()) @map("created_at")

  visit  Visit @relation(fields: [visitId], references: [id])
  doctor User  @relation(fields: [doctorId], references: [id])

  @@map("consultation_records")
}

model LabRequest {
  id                  String    @id @default(uuid())
  visitId             String    @map("visit_id")
  requestedByDoctorId String    @map("requested_by_doctor_id")
  testName            String    @map("test_name")
  testCode            String?   @map("test_code")
  instructions        String?
  status              String    @default("requested")      // LabRequestStatus
  results             String?
  resultNotes         String?   @map("result_notes")
  processedByTechId   String?   @map("processed_by_tech_id")
  fee                 Float     @default(0)
  requestedAt         DateTime  @default(now()) @map("requested_at")
  completedAt         DateTime? @map("completed_at")

  visit       Visit @relation(fields: [visitId], references: [id])
  processedBy User? @relation("ProcessedBy", fields: [processedByTechId], references: [id])

  @@map("lab_requests")
}

model PrescriptionItem {
  id                    String    @id @default(uuid())
  visitId               String    @map("visit_id")
  prescribedByDoctorId  String    @map("prescribed_by_doctor_id")
  medicationName        String    @map("medication_name")
  dosage                String
  frequency             String
  duration              String
  quantity              Int
  status                String    @default("pending")     // PrescriptionItemStatus
  dispensedByPharmacistId String? @map("dispensed_by_pharmacist_id")
  fee                   Float    @default(0)
  prescribedAt          DateTime @default(now()) @map("prescribed_at")
  dispensedAt           DateTime? @map("dispensed_at")

  visit       Visit @relation(fields: [visitId], references: [id])
  dispensedBy User? @relation("DispensedBy", fields: [dispensedByPharmacistId], references: [id])

  @@map("prescription_items")
}

model Bill {
  id          String    @id @default(uuid())
  visitId     String    @unique @map("visit_id")
  patientId   String    @map("patient_id")
  totalAmount Float     @default(0) @map("total_amount")
  paidAmount  Float     @default(0) @map("paid_amount")
  status      String    @default("pending")              // PaymentStatus
  generatedAt DateTime  @default(now()) @map("generated_at")
  paidAt      DateTime? @map("paid_at")

  visit    Visit              @relation(fields: [visitId], references: [id])
  patient  Patient            @relation(fields: [patientId], references: [id])
  items    BillItem[]
  payments PaymentTransaction[]

  @@map("bills")
}

model BillItem {
  id          String   @id @default(uuid())
  billId      String   @map("bill_id")
  description String
  category    String                                     // consultation | lab | pharmacy | other
  amount      Float
  createdAt   DateTime @default(now()) @map("created_at")

  bill Bill @relation(fields: [billId], references: [id])

  @@map("bill_items")
}

model PaymentTransaction {
  id                  String    @id @default(uuid())
  billId              String    @map("bill_id")
  visitId             String    @map("visit_id")
  patientId           String    @map("patient_id")
  phone               String
  amount              Float
  mpesaReceiptNumber  String?   @map("mpesa_receipt_number")
  merchantRequestId   String    @map("merchant_request_id")
  checkoutRequestId   String    @map("checkout_request_id")
  resultCode          Int?      @map("result_code")
  resultDescription   String?   @map("result_description")
  status              String    @default("pending")      // PaymentStatus
  initiatedAt         DateTime  @default(now()) @map("initiated_at")
  completedAt         DateTime? @map("completed_at")

  bill    Bill    @relation(fields: [billId], references: [id])
  visit   Visit   @relation(fields: [visitId], references: [id])
  patient Patient @relation(fields: [patientId], references: [id])

  @@index([checkoutRequestId])
  @@index([billId, status])
  @@map("payment_transactions")
}

model AuditLog {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  action       String
  resourceType String   @map("resource_type")
  resourceId   String   @map("resource_id")
  metadata     Json?
  ipAddress    String   @map("ip_address")
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([userId])
  @@index([resourceType, resourceId])
  @@map("audit_logs")
}
```

---

## 11. ENVIRONMENT CONFIGURATION

```env
# .env.example — copy to .env and fill in values

# Server
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173

# Database
DATABASE_URL=postgresql://afyaflow:afyaflow@localhost:5432/afyaflow

# JWT
JWT_ACCESS_SECRET=your-strong-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-strong-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Daraja 3.0 Sandbox
DARAJA_CONSUMER_KEY=
DARAJA_CONSUMER_SECRET=
DARAJA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
DARAJA_SHORTCODE=174379
DARAJA_BASE_URL=https://sandbox.safaricom.co.ke
DARAJA_CALLBACK_URL=https://your-tunnel.ngrok.io/api/v1/payments/callback

# Defaults
DEFAULT_CONSULTATION_FEE=500
DEFAULT_QUEUE_WAIT_MINUTES=15
```

---

## 12. API ROUTE MAP

| Method | Route | Auth | Roles | Description |
|--------|-------|------|-------|-------------|
| POST | `/api/v1/auth/login` | No | — | Login, returns JWT tokens |
| POST | `/api/v1/auth/refresh` | No | — | Refresh access token |
| POST | `/api/v1/patients` | Yes | receptionist, admin | Register new patient |
| GET | `/api/v1/patients/search` | Yes | all | Search by phone/ID/name |
| GET | `/api/v1/patients/:id` | Yes | all | Get patient details |
| GET | `/api/v1/patients/:id/visits` | Yes | all | Get patient visit history |
| POST | `/api/v1/visits` | Yes | receptionist, admin | Check-in (create visit) |
| GET | `/api/v1/visits/:id` | Yes | all | Get visit details with all clinical data |
| PATCH | `/api/v1/visits/:id/discharge` | Yes | billing_officer, admin | Discharge patient |
| GET | `/api/v1/queue/:department` | Yes | all | Get queue for a department |
| POST | `/api/v1/queue/action` | Yes | nurse, doctor, lab_tech, pharmacist, billing_officer | Call next / complete / skip / requeue |
| POST | `/api/v1/triage` | Yes | nurse | Submit triage vitals |
| GET | `/api/v1/triage/:visitId` | Yes | nurse, doctor, admin | Get triage record |
| POST | `/api/v1/consultations` | Yes | doctor | Submit consultation + lab/pharmacy requests |
| GET | `/api/v1/consultations/:visitId` | Yes | doctor, lab_tech, pharmacist, admin | Get consultation record |
| GET | `/api/v1/lab-requests` | Yes | lab_tech, doctor, admin | List lab requests (filterable by status) |
| PATCH | `/api/v1/lab-requests/:id/results` | Yes | lab_tech | Submit lab results |
| GET | `/api/v1/pharmacy/prescriptions` | Yes | pharmacist, doctor, admin | List prescriptions (filterable) |
| PATCH | `/api/v1/pharmacy/prescriptions/:id/dispense` | Yes | pharmacist | Mark as dispensed/out-of-stock |
| POST | `/api/v1/billing/:visitId/generate` | Yes | billing_officer, admin | Generate bill from visit charges |
| GET | `/api/v1/billing/:visitId` | Yes | billing_officer, admin | Get bill details |
| POST | `/api/v1/payments/stkpush` | Yes | billing_officer, admin | Initiate M-Pesa STK push |
| POST | `/api/v1/payments/callback` | No | — | Daraja callback (no auth, no rate limit) |
| GET | `/api/v1/payments/:billId/status` | Yes | billing_officer, admin | Check payment status |
| GET | `/api/v1/payments/:billId/receipt` | Yes | billing_officer, admin | Get payment receipt |

---

## 13. IMPLEMENTATION ORDER (1-Day Sprint)

### Phase 1: Foundation (First 2 Hours)
1. Initialize project: `npm init`, install dependencies, configure TypeScript
2. Set up Prisma schema, run migrations, write seed script with demo data
3. Build `app.ts` with middleware stack (helmet, cors, rate limiter, error handler)
4. Build auth module (login, JWT, role guard middleware)
5. Verify: can login and hit a protected route

### Phase 2: Core Patient Flow (Next 3 Hours)
6. Patient module (register, search, get)
7. Visit module (check-in, get with relations)
8. Queue module (create entry, get by department, call next, complete, auto-route to next department)
9. Triage module (submit vitals, get record)
10. Consultation module (submit diagnosis + lab/pharmacy requests)
11. Verify: can check in a patient, move through triage → consultation → queue updates

### Phase 3: Clinical & Payments (Next 3 Hours)
12. Lab module (list requests, submit results)
13. Pharmacy module (list prescriptions, mark dispensed)
14. Billing module (auto-generate from visit, get bill)
15. Payment module (STK Push, callback handler, status check, receipt)
16. Verify: full patient journey from check-in to paid bill

### Phase 4: Real-Time & Polish (Final 2 Hours)
17. Socket.io integration for queue updates and payment status
18. Seed comprehensive demo data for the live demo
19. Test the full end-to-end flow
20. Write the 2-page technical brief

---

## 14. DEPENDENCIES

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "@prisma/client": "^5.0.0",
    "socket.io": "^4.7.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "zod": "^3.22.0",
    "axios": "^1.6.0",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.0",
    "winston": "^3.11.0",
    "dotenv": "^16.3.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "prisma": "^5.0.0",
    "ts-node": "^10.9.0",
    "ts-node-dev": "^2.0.0",
    "nodemon": "^3.0.0",
    "@types/express": "^4.17.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/bcryptjs": "^2.4.0",
    "@types/cors": "^2.8.0",
    "@types/uuid": "^9.0.0"
  }
}
```

---

## 15. SCRIPTS

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:migrate": "npx prisma migrate dev",
    "db:seed": "npx prisma db seed",
    "db:reset": "npx prisma migrate reset --force",
    "db:studio": "npx prisma studio"
  }
}
```
