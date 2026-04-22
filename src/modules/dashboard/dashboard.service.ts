import prisma from '../../config/database';

export const getDashboardStats = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalPatients,
    atRiskPatients,
    patientsWithMissedMeds,
    overdueVisits,
    recentVisits,
    unreadNotifications,
    conditionCounts,
  ] = await Promise.all([
    prisma.patient.count({ where: { deletedAt: null } }),
    prisma.patient.count({ where: { deletedAt: null, isAtRisk: true } }),
    prisma.notification.groupBy({
      by: ['patientId'],
      where: { type: 'missed_medication', createdAt: { gte: thirtyDaysAgo } },
      _count: true,
    }),
    prisma.visit.findMany({
      where: { nextVisitDate: { lt: now }, patient: { deletedAt: null } },
      distinct: ['patientId'],
      select: { patientId: true },
    }),
    prisma.visit.count({ where: { visitDate: { gte: sevenDaysAgo } } }),
    prisma.notification.count({ where: { isRead: false } }),
    prisma.patientCondition.groupBy({
      by: ['conditionId'],
      _count: { patientId: true },
      where: { patient: { deletedAt: null } },
    }),
  ]);

  const conditionIds = conditionCounts.map((c: { conditionId: string }) => c.conditionId);
  const conditions = await prisma.condition.findMany({ where: { id: { in: conditionIds } } });
  const conditionMap = new Map(conditions.map((c: { id: string; name: string }) => [c.id, c.name]));

  const conditionBreakdown = conditionCounts.map((c: { conditionId: string; _count: { patientId: number } }) => ({
    condition: conditionMap.get(c.conditionId) ?? 'Unknown',
    count: c._count.patientId,
  }));

  return {
    summary: {
      totalPatients,
      atRiskPatients,
      patientsNeedingFollowUp: overdueVisits.length,
      patientsWithMissedMedication: patientsWithMissedMeds.length,
      visitsThisWeek: recentVisits,
      unreadNotifications,
    },
    conditionBreakdown,
    alerts: {
      overdueVisitCount: overdueVisits.length,
      atRiskCount: atRiskPatients,
      missedMedicationCount: patientsWithMissedMeds.length,
    },
  };
};
