import prisma from '../../config/database';
import { generatePatientCode } from '../../utils/patientCode';
import { CreatePatientInput, UpdatePatientInput } from './patients.schema';
import { PaginationParams, ConditionType } from '../../types';

interface PatientFilters {
  condition?: string;
  isAtRisk?: boolean;
  location?: string;
  search?: string;
}

export const createPatient = async (input: CreatePatientInput) => {
  const patientCode = generatePatientCode();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prisma.$transaction(async (tx: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const patient = await tx.patient.create({
      data: {
        patientCode,
        name: input.name,
        age: input.age,
        gender: input.gender as 'male' | 'female' | 'other',
        location: input.location,
        phone: input.phone,
      },
    });

    if (input.conditions && input.conditions.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const conditions = await tx.condition.findMany({
        where: { name: { in: input.conditions as ConditionType[] } },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await tx.patientCondition.createMany({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: (conditions as any[]).map((c: { id: string }) => ({ patientId: (patient as { id: string }).id, conditionId: c.id })),
      });
    }

    return getPatientById((patient as { id: string }).id);
  });
};

export const getPatients = async (filters: PatientFilters, pagination: PaginationParams) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { deletedAt: null };

  if (filters.isAtRisk !== undefined) where['isAtRisk'] = filters.isAtRisk;
  if (filters.location) where['location'] = { contains: filters.location, mode: 'insensitive' };
  if (filters.search) {
    where['OR'] = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { patientCode: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.condition) {
    where['conditions'] = { some: { condition: { name: filters.condition } } };
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        conditions: { include: { condition: true } },
        visits: { orderBy: { visitDate: 'desc' }, take: 1 },
        _count: { select: { visits: true, medicalRecords: true } },
      },
    }),
    prisma.patient.count({ where }),
  ]);

  return { patients, total };
};

export const getPatientById = async (id: string) => {
  const patient = await prisma.patient.findFirst({
    where: { id, deletedAt: null },
    include: {
      conditions: { include: { condition: true } },
      medications: { where: { isActive: true }, include: { medication: true } },
      visits: {
        orderBy: { visitDate: 'desc' },
        take: 5,
        include: { measurements: true, healthWorker: { select: { id: true, name: true } } },
      },
      medicalRecords: { orderBy: { recordedAt: 'desc' }, take: 10 },
      notes: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!patient) throw new Error('Patient not found');
  return patient;
};

export const updatePatient = async (id: string, input: UpdatePatientInput) => {
  const existing = await prisma.patient.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new Error('Patient not found');

  const { conditions, ...rest } = input;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prisma.$transaction(async (tx: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await tx.patient.update({ where: { id }, data: rest });

    if (conditions !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await tx.patientCondition.deleteMany({ where: { patientId: id } });

      if (conditions.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const dbConditions = await tx.condition.findMany({
          where: { name: { in: conditions as ConditionType[] } },
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await tx.patientCondition.createMany({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: (dbConditions as any[]).map((c: { id: string }) => ({ patientId: id, conditionId: c.id })),
        });
      }
    }

    return getPatientById(id);
  });
};

export const softDeletePatient = async (id: string) => {
  const existing = await prisma.patient.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new Error('Patient not found');

  return prisma.patient.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: { id: true, patientCode: true, deletedAt: true },
  });
};

export const markAtRisk = async (id: string, isAtRisk: boolean) => {
  const existing = await prisma.patient.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new Error('Patient not found');

  return prisma.patient.update({
    where: { id },
    data: { isAtRisk },
    select: { id: true, patientCode: true, isAtRisk: true },
  });
};
