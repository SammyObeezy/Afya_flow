import prisma from '../../config/database';
import { PaginationParams } from '../../types';

export const getNotifications = async (
  healthWorkerId: string,
  pagination: PaginationParams,
  unreadOnly?: boolean
) => {
  const where = {
    healthWorkerId,
    ...(unreadOnly && { isRead: false }),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
      include: { patient: { select: { id: true, name: true, patientCode: true } } },
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, total };
};

export const markAsRead = async (id: string, healthWorkerId: string) => {
  const notification = await prisma.notification.findFirst({ where: { id, healthWorkerId } });
  if (!notification) throw new Error('Notification not found');

  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
    select: { id: true, isRead: true, updatedAt: true },
  });
};

export const markAllAsRead = async (healthWorkerId: string) => {
  const result = await prisma.notification.updateMany({
    where: { healthWorkerId, isRead: false },
    data: { isRead: true },
  });
  return { updated: result.count };
};

export const checkMissedVisits = async () => {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const overdueVisits = await prisma.visit.findMany({
    where: {
      nextVisitDate: { lt: new Date() },
      patient: { deletedAt: null },
    },
    include: {
      patient: true,
      healthWorker: true,
    },
    distinct: ['patientId'],
    orderBy: { nextVisitDate: 'asc' },
  });

  const notifications = [];

  for (const visit of overdueVisits) {
    const existingNotif = await prisma.notification.findFirst({
      where: {
        patientId: visit.patientId,
        type: 'upcoming_visit',
        createdAt: { gte: threeDaysAgo },
      },
    });

    if (!existingNotif) {
      const notif = await prisma.notification.create({
        data: {
          patientId: visit.patientId,
          healthWorkerId: visit.healthWorkerId,
          type: 'upcoming_visit',
          title: 'Missed Scheduled Visit',
          message: `Patient ${visit.patient.name} (${visit.patient.patientCode}) missed their scheduled visit on ${visit.nextVisitDate?.toDateString()}.`,
          smsTriggered: true,
          smsLog: `[SMS LOG] Would notify CHW ${visit.healthWorker.name} about missed visit for ${visit.patient.name}`,
        },
      });

      if (!visit.patient.isAtRisk) {
        await prisma.patient.update({ where: { id: visit.patientId }, data: { isAtRisk: true } });
      }

      notifications.push(notif);
    }
  }

  return { processed: overdueVisits.length, notificationsCreated: notifications.length };
};
