import { Controller, Get, Query, Post, Param, Delete, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@UseGuards(AdminAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('user-growth')
  async getUserGrowth(@Query('days') days: string = '7') {
    return this.adminService.getUserGrowthData(parseInt(days));
  }

  @Get('category-distribution')
  async getCategoryDistribution() {
    return this.adminService.getCategoryDistribution();
  }

  @Get('recent-activity')
  async getRecentActivity() {
    return this.adminService.getRecentActivity();
  }

  @Get('earnings')
  async getEarnings() {
    return this.adminService.getEarningsStats();
  }

  @Get('reports')
  async getListingReports() {
    return this.adminService.getListingReports();
  }

  @Get('listings/:id')
  async getListingDetails(@Param('id') id: string) {
    return this.adminService.getListingDetails(parseInt(id));
  }

  @Post('reports/:id/dismiss')
  async dismissReport(@Param('id') id: string) {
    return this.adminService.dismissReport(parseInt(id));
  }

  @Post('reports/:id/delete-listing')
  async deleteReportedListing(@Param('id') id: string) {
    return this.adminService.deleteReportedListing(parseInt(id));
  }

  @Get('users')
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(parseInt(page), parseInt(limit), search);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(parseInt(id));
  }
}
