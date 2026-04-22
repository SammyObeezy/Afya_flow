-- AlterTable
ALTER TABLE "conditions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "health_workers" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "measurements" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "medical_records" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "medications" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "patient_conditions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "patient_medications" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "patients" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "visits" ALTER COLUMN "id" DROP DEFAULT;
