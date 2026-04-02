import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async createNotification(reportId: number, title: string, message: string) {
    return this.prisma.adminNotification.create({
      data: {
        reportId,
        title,
        message,
        type: 'report',
      },
      include: {
        report: {
          include: {
            listing: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
            reporter: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  }

  async getPendingNotifications() {
    return this.prisma.adminNotification.findMany({
      where: { isRead: false },
      orderBy: { createdAt: 'desc' },
      include: {
        report: {
          include: {
            listing: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
            reporter: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  }

  async getAllNotifications() {
    return this.prisma.adminNotification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        report: {
          include: {
            listing: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
            reporter: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  }

  async markAsRead(notificationId: number) {
    return this.prisma.adminNotification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead() {
    return this.prisma.adminNotification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount() {
    return this.prisma.adminNotification.count({
      where: { isRead: false },
    });
  }
}