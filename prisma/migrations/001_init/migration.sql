-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'health_worker');
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');
CREATE TYPE "ConditionType" AS ENUM ('HIV', 'TB', 'Hypertension', 'Malaria', 'Typhoid', 'Diabetes', 'Other');
CREATE TYPE "NotificationType" AS ENUM ('missed_medication', 'upcoming_visit', 'at_risk_alert', 'general');
CREATE TYPE "SyncStatus" AS ENUM ('synced', 'pending', 'conflict');

-- CreateTable: roles
CREATE TABLE "roles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" "Role" NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateTable: health_workers
CREATE TABLE "health_workers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "phone" TEXT,
  "role" "Role" NOT NULL DEFAULT 'health_worker',
  "role_id" UUID,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sync_status" "SyncStatus" NOT NULL DEFAULT 'synced',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "health_workers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "health_workers_email_key" ON "health_workers"("email");
CREATE INDEX "health_workers_email_idx" ON "health_workers"("email");

-- CreateTable: patients
CREATE TABLE "patients" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patient_code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "age" INTEGER NOT NULL,
  "gender" "Gender" NOT NULL,
  "location" TEXT NOT NULL,
  "phone" TEXT,
  "is_at_risk" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "sync_status" "SyncStatus" NOT NULL DEFAULT 'synced',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "patients_patient_code_key" ON "patients"("patient_code");
CREATE INDEX "patients_patient_code_idx" ON "patients"("patient_code");
CREATE INDEX "patients_is_at_risk_idx" ON "patients"("is_at_risk");
CREATE INDEX "patients_deleted_at_idx" ON "patients"("deleted_at");

-- CreateTable: conditions
CREATE TABLE "conditions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" "ConditionType" NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conditions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "conditions_name_key" ON "conditions"("name");

-- CreateTable: patient_conditions
CREATE TABLE "patient_conditions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patient_id" UUID NOT NULL,
  "condition_id" UUID NOT NULL,
  "diagnosed_at" TIMESTAMP(3),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "patient_conditions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_conditions_patient_id_condition_id_key" UNIQUE ("patient_id", "condition_id"),
  CONSTRAINT "patient_conditions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "patient_conditions_condition_id_fkey" FOREIGN KEY ("condition_id") REFERENCES "conditions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "patient_conditions_patient_id_idx" ON "patient_conditions"("patient_id");

-- CreateTable: medications
CREATE TABLE "medications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "dosage_unit" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable: patient_medications
CREATE TABLE "patient_medications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patient_id" UUID NOT NULL,
  "medication_id" UUID NOT NULL,
  "dosage" TEXT NOT NULL,
  "frequency" TEXT NOT NULL,
  "start_date" TIMESTAMP(3) NOT NULL,
  "end_date" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "patient_medications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_medications_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "patient_medications_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "patient_medications_patient_id_idx" ON "patient_medications"("patient_id");

-- CreateTable: visits
CREATE TABLE "visits" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patient_id" UUID NOT NULL,
  "health_worker_id" UUID NOT NULL,
  "visit_date" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "medication_adherence" BOOLEAN,
  "next_visit_date" TIMESTAMP(3),
  "sync_status" "SyncStatus" NOT NULL DEFAULT 'synced',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "visits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "visits_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "visits_health_worker_id_fkey" FOREIGN KEY ("health_worker_id") REFERENCES "health_workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "visits_patient_id_idx" ON "visits"("patient_id");
CREATE INDEX "visits_health_worker_id_idx" ON "visits"("health_worker_id");
CREATE INDEX "visits_visit_date_idx" ON "visits"("visit_date");

-- CreateTable: measurements
CREATE TABLE "measurements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "visit_id" UUID NOT NULL,
  "systolic" INTEGER,
  "diastolic" INTEGER,
  "weight" DOUBLE PRECISION,
  "height" DOUBLE PRECISION,
  "temperature" DOUBLE PRECISION,
  "blood_sugar" DOUBLE PRECISION,
  "oxygen_saturation" DOUBLE PRECISION,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "measurements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "measurements_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "measurements_visit_id_idx" ON "measurements"("visit_id");

-- CreateTable: medical_records
CREATE TABLE "medical_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patient_id" UUID NOT NULL,
  "record_type" TEXT NOT NULL,
  "tb_status" TEXT,
  "hiv_viral_load" DOUBLE PRECISION,
  "hiv_test_date" TIMESTAMP(3),
  "hiv_test_result" TEXT,
  "malaria_result" TEXT,
  "typhoid_result" TEXT,
  "arv_regimen" TEXT,
  "notes" TEXT,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "medical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "medical_records_patient_id_idx" ON "medical_records"("patient_id");
CREATE INDEX "medical_records_recorded_at_idx" ON "medical_records"("recorded_at");

-- CreateTable: notes
CREATE TABLE "notes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patient_id" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "notes_patient_id_idx" ON "notes"("patient_id");

-- CreateTable: notifications
CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patient_id" UUID,
  "health_worker_id" UUID,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "sms_triggered" BOOLEAN NOT NULL DEFAULT false,
  "sms_log" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "notifications_health_worker_id_fkey" FOREIGN KEY ("health_worker_id") REFERENCES "health_workers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "notifications_patient_id_idx" ON "notifications"("patient_id");
CREATE INDEX "notifications_health_worker_id_idx" ON "notifications"("health_worker_id");
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- Foreign key: health_workers -> roles
ALTER TABLE "health_workers" ADD CONSTRAINT "health_workers_role_id_fkey" 
  FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
