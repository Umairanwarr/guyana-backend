import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/reports')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get('notifications')
  async getNotifications() {
    const notifications = await this.notificationsService.getAllNotifications();
    const unreadCount = await this.notificationsService.getUnreadCount();
    return { notifications, unreadCount };
  }

  @Get('notifications/unread-count')
  async getUnreadCount() {
    const count = await this.notificationsService.getUnreadCount();
    return { unreadCount: count };
  }

  @Post('notifications/:id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(parseInt(id));
  }

  @Post('notifications/read-all')
  async markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }
}