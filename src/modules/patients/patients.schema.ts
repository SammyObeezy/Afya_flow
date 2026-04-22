import { z } from 'zod';

export const createPatientSchema = z.object({
  name: z.string().min(2),
  age: z.number().int().min(0).max(150),
  gender: z.enum(['male', 'female', 'other']),
  location: z.string().min(2),
  phone: z.string().optional(),
  conditions: z.array(z.enum(['HIV', 'TB', 'Hypertension', 'Malaria', 'Typhoid', 'Diabetes', 'Other'])).optional().default([]),
});

export const updatePatientSchema = createPatientSchema.partial();

export const patientFilterSchema = z.object({
  condition: z.string().optional(),
  isAtRisk: z.string().optional(),
  location: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
