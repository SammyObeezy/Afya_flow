import prisma from '../../config/database';
import { CreateVisitInput, CreateMedicalRecordInput } from './visits.schema';
import { PaginationParams } from '../../types';

export const createVisit = async (input: CreateVisitInput, healthWorkerId: string) => {
  const patient = await prisma.patient.findFirst({ where: { id: input.patientId, deletedAt: null } });
  if (!patient) throw new Error('Patient not found');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prisma.$transaction(async (tx: any) => {
    const visit = await tx.visit.create({
      data: {
        patientId: input.patientId,
        healthWorkerId,
        visitDate: new Date(input.visitDate),
        notes: input.notes,
        medicationAdherence: input.medicationAdherence,
        nextVisitDate: input.nextVisitDate ? new Date(input.nextVisitDate) : undefined,
      },
    });

    if (input.measurements) {
      await tx.measurement.create({
        data: { visitId: visit.id, ...input.measurements },
      });
    }

    if (input.medicationAdherence === false) {
      await tx.patient.update({ where: { id: input.patientId }, data: { isAtRisk: true } });

      await tx.notification.create({
        data: {
          patientId: input.patientId,
          type: 'missed_medication',
          title: 'Missed Medication Reported',
          message: `Patient ${patient.name} (${patient.patientCode}) reported missed medication.`,
          smsTriggered: true,
          smsLog: `[SMS LOG] Would send to ${patient.phone ?? 'no phone'}: Medication reminder for ${patient.name}`,
        },
      });
    }

    return tx.visit.findUnique({
      where: { id: visit.id },
      include: { measurements: true, healthWorker: { select: { id: true, name: true } } },
    });
  });
};

export const getPatientVisits = async (patientId: string, pagination: PaginationParams) => {
  const [visits, total] = await Promise.all([
    prisma.visit.findMany({
      where: { patientId },
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { visitDate: 'desc' },
      include: { measurements: true, healthWorker: { select: { id: true, name: true } } },
    }),
    prisma.visit.count({ where: { patientId } }),
  ]);
  return { visits, total };
};

export const createMedicalRecord = async (input: CreateMedicalRecordInput) => {
  const patient = await prisma.patient.findFirst({ where: { id: input.patientId, deletedAt: null } });
  if (!patient) throw new Error('Patient not found');

  return prisma.medicalRecord.create({
    data: {
      ...input,
      hivTestDate: input.hivTestDate ? new Date(input.hivTestDate) : undefined,
    },
  });
};

export const getPatientMedicalRecords = async (patientId: string, pagination: PaginationParams) => {
  const [records, total] = await Promise.all([
    prisma.medicalRecord.findMany({
      where: { patientId },
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { recordedAt: 'desc' },
    }),
    prisma.medicalRecord.count({ where: { patientId } }),
  ]);
  return { records, total };
};

export const addNote = async (patientId: string, content: string) => {
  const patient = await prisma.patient.findFirst({ where: { id: patientId, deletedAt: null } });
  if (!patient) throw new Error('Patient not found');
  return prisma.note.create({ data: { patientId, content } });
};
