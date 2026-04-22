import { z } from 'zod';

export const createVisitSchema = z.object({
  patientId: z.string().uuid(),
  visitDate: z.string().datetime().optional().default(() => new Date().toISOString()),
  notes: z.string().optional(),
  medicationAdherence: z.boolean().optional(),
  nextVisitDate: z.string().datetime().optional(),
  measurements: z.object({
    systolic: z.number().int().min(0).max(300).optional(),
    diastolic: z.number().int().min(0).max(200).optional(),
    weight: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
    temperature: z.number().min(30).max(45).optional(),
    bloodSugar: z.number().min(0).optional(),
    oxygenSat: z.number().min(0).max(100).optional(),
  }).optional(),
});

export const createMedicalRecordSchema = z.object({
  patientId: z.string().uuid(),
  recordType: z.string().min(1),
  tbStatus: z.string().optional(),
  hivViralLoad: z.number().optional(),
  hivTestDate: z.string().datetime().optional(),
  hivTestResult: z.string().optional(),
  malariaResult: z.string().optional(),
  typhoidResult: z.string().optional(),
  arvRegimen: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type CreateMedicalRecordInput = z.infer<typeof createMedicalRecordSchema>;
