import { Controller, Get, Post, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class UserNotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getNotifications(@Req() req: any) {
    console.log('🔔 GET /api/notifications - req.user:', JSON.stringify(req.user));
    const userId = req.user?.id || req.user?.userId;
    console.log('🔔 Extracted userId:', userId);
    if (!userId) return { notifications: [], unreadCount: 0 };

    const notifications = await this.prisma.userNotification.findMany({
      where: { userId: Number(userId) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    console.log('🔔 Found', notifications.length, 'notifications for user', userId);

    const unreadCount = await this.prisma.userNotification.count({
      where: { userId: Number(userId), isRead: false },
    });

    return { notifications, unreadCount };
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return { unreadCount: 0 };

    const count = await this.prisma.userNotification.count({
      where: { userId: Number(userId), isRead: false },
    });
    return { unreadCount: count };
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.prisma.userNotification.updateMany({
      where: { id: parseInt(id), userId: Number(userId) },
      data: { isRead: true },
    });
  }

  @Post('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.prisma.userNotification.updateMany({
      where: { userId: Number(userId), isRead: false },
      data: { isRead: true },
    });
  }

  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.prisma.userNotification.deleteMany({
      where: { id: parseInt(id), userId: Number(userId) },
    });
  }
}