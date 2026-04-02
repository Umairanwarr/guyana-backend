import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { subDays, format } from 'date-fns';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalUsers, totalListings, activeListings, totalFavorites] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.count(),
      this.prisma.listing.count({ where: { status: 'active' } }),
      this.prisma.favorite.count(),
    ]);
    return { totalUsers, totalListings, activeListings, totalFavorites };
  }

  async getEarningsStats() {
    const earningsByUser = await this.prisma.listing.groupBy({
      by: ['userId'],
      where: { status: 'sold' },
      _sum: { price: true },
    });
    const userIds = earningsByUser.map((e) => e.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const earnings = earningsByUser.map((e) => {
      const user = users.find((u) => u.id === e.userId);
      return {
        userId: e.userId,
        userName: user?.name ?? 'Unknown',
        earnings: e._sum.price ?? 0,
      };
    });
    const totalEarnings = earnings.reduce((sum, cur) => sum + cur.earnings, 0);
    return { totalEarnings, earnings };
  }

  async getUserGrowthData(days: number = 7) {
    const startDate = subDays(new Date(), days);

    const usersByDay: { date: string; count: string }[] = await this.prisma.$queryRaw`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "User"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    ` as any;

    const result: { name: string; users: number; listings: number }[] = [];
    for (let i = days; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'EEE');
      const found = usersByDay.find((u) => format(new Date(u.date), 'EEE') === date);
      result.push({ name: date, users: found ? Number(found.count) : 0, listings: 0 });
    }

    const listingsByDay: { date: string; count: string }[] = await this.prisma.$queryRaw`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "Listing"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    ` as any;

    listingsByDay.forEach((l) => {
      const dayName = format(new Date(l.date), 'EEE');
      const found = result.find((r) => r.name === dayName);
      if (found) {
        found.listings = Number(l.count);
      }
    });
    return result;
  }

  async getCategoryDistribution() {
    try {
      const categories: { name: string; count: string }[] = await this.prisma.$queryRaw`
        SELECT c.name, COUNT(l.id) as count
        FROM "Category" c
        LEFT JOIN "Listing" l ON c.id = l."categoryId"
        GROUP BY c.id, c.name
        ORDER BY count DESC
      ` as any;
      const withListings = categories
        .filter((c) => Number(c.count) > 0)
        .map((c) => ({ name: c.name, value: Number(c.count) }));
      if (withListings.length) return withListings;
    } catch (e) {
      console.log('Category table not found, using categoryId directly');
    }
    const listings = await this.prisma.listing.findMany({ select: { categoryId: true } });
    const counts: Record<string, number> = {};
    listings.forEach((l) => {
      const key = l.categoryId ?? 'other';
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }

  async getRecentActivity() {
    const recentUsers = await this.prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { name: true, email: true, createdAt: true },
    });
    const recentListings = await this.prisma.listing.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        title: true,
        price: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });
    return {
      users: recentUsers.map((u: any) => ({ type: 'user', name: u.name || u.email, timestamp: u.createdAt })),
      listings: recentListings.map((l: any) => ({ type: 'listing', title: l.title, price: l.price, timestamp: l.createdAt })),
    };
  }

  async getListingReports() {
    const reports = await this.prisma.listingReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        listing: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        reporter: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    return reports;
  }

  async getListingDetails(listingId: number) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, photoUrl: true },
        },
      },
    });
    if (!listing) {
      throw new Error('Listing not found');
    }
    return listing;
  }

  async dismissReport(reportId: number) {
    const report = await this.prisma.listingReport.findUnique({
      where: { id: reportId },
      include: { listing: true },
    });

    const updated = await this.prisma.listingReport.update({
      where: { id: reportId },
      data: { status: 'dismissed' },
    });

    if (report) {
      await this.prisma.userNotification.create({
        data: {
          userId: report.reporterId,
          eventType: 'report_dismissed',
          title: 'Report Reviewed',
          message: 'After review, no issues were found with the reported listing',
          reportId: reportId,
          listingId: report.listingId,
          listingTitle: report.listing.title,
        },
      });
    }

    return updated;
  }

  async deleteReportedListing(reportId: number) {
    const report = await this.prisma.listingReport.findUnique({
      where: { id: reportId },
      include: { listing: true },
    });
    if (!report) {
      throw new Error('Report not found');
    }
    await this.prisma.listing.delete({
      where: { id: report.listingId },
    });
    const updated = await this.prisma.listingReport.update({
      where: { id: reportId },
      data: { status: 'resolved' },
    });

    await this.prisma.userNotification.create({
      data: {
        userId: report.reporterId,
        eventType: 'report_resolved',
        title: 'Report Resolved',
        message: 'The reported listing has been successfully deleted',
        reportId: reportId,
        listingId: report.listingId,
        listingTitle: report.listing.title,
      },
    });

    return updated;
  }

  async getUsers(page: number = 1, limit: number = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          photoUrl: true,
          createdAt: true,
          _count: {
            select: {
              listings: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { success: true, deletedUser: user };
  }
}
