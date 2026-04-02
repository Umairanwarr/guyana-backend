import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { QueryListingsDto, SortOrder } from './dto/query-listings.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ListingsService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
    private notificationsService: NotificationsService,
  ) {}

  async create(createListingDto: CreateListingDto, userId: number) {
    const images = createListingDto.images ? JSON.stringify(createListingDto.images) : '[]';

    return this.prisma.listing.create({
      data: {
        title: createListingDto.title,
        description: createListingDto.description,
        price: createListingDto.price,
        negotiable: createListingDto.negotiable,
        categoryId: createListingDto.categoryId,
        condition: createListingDto.condition,
        location: createListingDto.location,
        contactPhone: createListingDto.contactPhone,
        contactMethod: createListingDto.contactMethod,
        images,
        userId,
        // Map coordinates
        latitude: createListingDto.latitude,
        longitude: createListingDto.longitude,
        // Vehicle specific
        brand: createListingDto.brand,
        model: createListingDto.model,
        year: createListingDto.year,
        mileage: createListingDto.mileage,
        transmission: createListingDto.transmission,
        fuelType: createListingDto.fuelType,
        // Real Estate specific
        propertyType: createListingDto.propertyType,
        bedrooms: createListingDto.bedrooms,
        bathrooms: createListingDto.bathrooms,
        area: createListingDto.area,
        furnished: createListingDto.furnished,
        parking: createListingDto.parking,
        gated: createListingDto.gated,
        tiled: createListingDto.tiled,
        ac: createListingDto.ac,
        ensuite: createListingDto.ensuite,
        water: createListingDto.water,
        amenities: createListingDto.amenities,
        cupboards: createListingDto.cupboards,
        village: createListingDto.village,
        // Jobs specific
        jobType: createListingDto.jobType,
        experienceLevel: createListingDto.experienceLevel,
        salaryPeriod: createListingDto.salaryPeriod,
        companyName: createListingDto.companyName,
        industry: createListingDto.industry,
        currency: createListingDto.currency,
      } as any,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photoUrl: true,
          },
        },
      },
    });
  }

  async findAll(query: QueryListingsDto, currentUserId?: number) {
    const { category, search, sort, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      status: 'active',
    };

    if (category && category.toLowerCase() !== 'all') {
      where.categoryId = { equals: category, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = {};
    switch (sort) {
      case SortOrder.PriceLow:
        orderBy = { price: 'asc' };
        break;
      case SortOrder.PriceHigh:
        orderBy = { price: 'desc' };
        break;
      case SortOrder.Newest:
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [listings, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              photoUrl: true,
            },
          },
          favorites: currentUserId
            ? {
                where: { userId: currentUserId },
              }
            : false,
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    // Parse images JSON string to array and mark favorited
    const parsedListings = listings.map((listing: any) => ({
      ...listing,
      images: JSON.parse(listing.images as string),
      favorited: currentUserId ? (listing.favorites?.length > 0) : false,
      favorites: undefined, // cleanup
    }));

    return {
      data: parsedListings,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number, currentUserId?: number) {
    const listing: any = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photoUrl: true,
          },
        },
        favorites: currentUserId
          ? {
              where: { userId: currentUserId },
            }
          : false,
      },
    });

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    return {
      ...listing,
      images: JSON.parse(listing.images as string),
      favorited: currentUserId ? (listing.favorites?.length > 0) : false,
      favorites: undefined, // cleanup
    };
  }

  async update(id: number, updateListingDto: UpdateListingDto, userId: number) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    if (listing.userId !== userId) {
      throw new ForbiddenException('You can only update your own listings');
    }

    const data: any = {};
    if (updateListingDto.title !== undefined) data.title = updateListingDto.title;
    if (updateListingDto.description !== undefined) data.description = updateListingDto.description;
    if (updateListingDto.price !== undefined) data.price = updateListingDto.price;
    if (updateListingDto.negotiable !== undefined) data.negotiable = updateListingDto.negotiable;
    if (updateListingDto.categoryId !== undefined) data.categoryId = updateListingDto.categoryId;
    if (updateListingDto.condition !== undefined) data.condition = updateListingDto.condition;
    if (updateListingDto.location !== undefined) data.location = updateListingDto.location;
    if (updateListingDto.contactPhone !== undefined) data.contactPhone = updateListingDto.contactPhone;
    if (updateListingDto.contactMethod !== undefined) data.contactMethod = updateListingDto.contactMethod;
    if (updateListingDto.brand !== undefined) data.brand = updateListingDto.brand;
    if (updateListingDto.model !== undefined) data.model = updateListingDto.model;
    if (updateListingDto.year !== undefined) data.year = updateListingDto.year;
    if (updateListingDto.mileage !== undefined) data.mileage = updateListingDto.mileage;
    if (updateListingDto.transmission !== undefined) data.transmission = updateListingDto.transmission;
    if (updateListingDto.fuelType !== undefined) data.fuelType = updateListingDto.fuelType;
    if (updateListingDto.propertyType !== undefined) data.propertyType = updateListingDto.propertyType;
    if (updateListingDto.bedrooms !== undefined) data.bedrooms = updateListingDto.bedrooms;
    if (updateListingDto.bathrooms !== undefined) data.bathrooms = updateListingDto.bathrooms;
    if (updateListingDto.area !== undefined) data.area = updateListingDto.area;
    if (updateListingDto.furnished !== undefined) data.furnished = updateListingDto.furnished;
    if (updateListingDto.parking !== undefined) data.parking = updateListingDto.parking;
    if (updateListingDto.gated !== undefined) data.gated = updateListingDto.gated;
    if (updateListingDto.tiled !== undefined) data.tiled = updateListingDto.tiled;
    if (updateListingDto.ac !== undefined) data.ac = updateListingDto.ac;
    if (updateListingDto.ensuite !== undefined) data.ensuite = updateListingDto.ensuite;
    if (updateListingDto.water !== undefined) data.water = updateListingDto.water;
    if (updateListingDto.amenities !== undefined) data.amenities = updateListingDto.amenities;
    if (updateListingDto.cupboards !== undefined) data.cupboards = updateListingDto.cupboards;
    if (updateListingDto.village !== undefined) data.village = updateListingDto.village;
    if (updateListingDto.jobType !== undefined) data.jobType = updateListingDto.jobType;
    if (updateListingDto.experienceLevel !== undefined) data.experienceLevel = updateListingDto.experienceLevel;
    if (updateListingDto.salaryPeriod !== undefined) data.salaryPeriod = updateListingDto.salaryPeriod;
    if (updateListingDto.companyName !== undefined) data.companyName = updateListingDto.companyName;
    if (updateListingDto.industry !== undefined) data.industry = updateListingDto.industry;
    if (updateListingDto.currency !== undefined) data.currency = updateListingDto.currency;
    if (updateListingDto.status !== undefined) data.status = updateListingDto.status;

    if (updateListingDto.latitude !== undefined) data.latitude = updateListingDto.latitude;
    if (updateListingDto.longitude !== undefined) data.longitude = updateListingDto.longitude;
    
    if (updateListingDto.images) {
      data.images = JSON.stringify(updateListingDto.images);
    }

    return this.prisma.listing.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photoUrl: true,
          },
        },
      },
    });
  }

  async remove(id: number, userId: number) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    if (listing.userId !== userId) {
      throw new ForbiddenException('You can only delete your own listings');
    }

    return this.prisma.listing.delete({
      where: { id },
    });
  }

  async findByUser(userId: number) {
    const listings = await this.prisma.listing.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return listings.map((listing) => ({
      ...listing,
      images: JSON.parse(listing.images as string),
    }));
  }

  async toggleFavorite(userId: number, listingId: number) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
    });

    if (favorite) {
      await this.prisma.favorite.delete({
        where: { id: favorite.id },
      });
      return { favorited: false };
    } else {
      await this.prisma.favorite.create({
        data: {
          userId,
          listingId,
        },
      });
      return { favorited: true };
    }
  }

  async reportListing(listingId: number, reporterId: number, reason: string, description?: string) {
    const report = await this.prisma.listingReport.create({
      data: {
        listingId,
        reporterId,
        reason,
        description: description || null,
        status: 'pending',
      },
      include: {
        listing: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        reporter: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const notification = await this.notificationsService.createNotification(
      report.id,
      'New Report Submitted',
      `${report.reporter.name || 'Anonymous'} reported "${report.listing.title}" for ${reason}`,
    );

    this.notificationsGateway.sendNewReportNotification({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      report: {
        id: report.id,
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt,
        listing: {
          id: report.listing.id,
          title: report.listing.title,
          price: report.listing.price,
          user: report.listing.user,
        },
        reporter: report.reporter,
      },
      createdAt: notification.createdAt,
    });

    await this.prisma.userNotification.create({
      data: {
        userId: reporterId,
        eventType: 'report_submitted',
        title: 'Report Submitted',
        message: 'Your report has been sent to the admin team for review and action',
        reportId: report.id,
        listingId: listingId,
        listingTitle: report.listing.title,
      },
    });

    return report;
  }

  async getFavorites(userId: number) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        listing: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                photoUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((fav) => ({
      ...fav.listing,
      images: JSON.parse(fav.listing.images as string),
      favorited: true,
    }));
  }
}
