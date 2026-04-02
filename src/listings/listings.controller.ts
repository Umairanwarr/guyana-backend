import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { QueryListingsDto } from './dto/query-listings.dto';
import { JwtService } from '@nestjs/jwt';

@Controller('listings')
export class ListingsController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly jwtService: JwtService,
  ) {}

  private getUserIdFromRequest(req: any, required = true): number | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (required) throw new BadRequestException('No token provided');
      return null;
    }
    try {
      const token = authHeader.split(' ')[1];
      const payload = this.jwtService.verify(token);
      return payload.sub;
    } catch (e) {
      if (required) throw new BadRequestException('Invalid token');
      return null;
    }
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 10 },
        { name: 'coverImage', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './uploads/listings',
          filename: (req, file, callback) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
          },
        }),
      },
    ),
  )
  async create(
    @Body() createListingDto: CreateListingDto,
    @Req() req: any,
    @UploadedFiles()
    files?: { images?: Express.Multer.File[]; coverImage?: Express.Multer.File[] },
  ) {
    const userId = this.getUserIdFromRequest(req) as number;

    // Process uploaded images
    const imagePaths: string[] = [];
    if (files?.images) {
      for (const file of files.images) {
        imagePaths.push(`/uploads/listings/${file.filename}`);
      }
    }
    if (files?.coverImage) {
      imagePaths.unshift(`/uploads/listings/${files.coverImage[0].filename}`);
    }

    // Manual fix for create: Parse negotiable properly from form data
    if (createListingDto.negotiable !== undefined) {
      const rawValue: any = createListingDto.negotiable;
      createListingDto.negotiable = rawValue === 'true' || rawValue === true;
    }

    const listing = await this.listingsService.create(
      { ...createListingDto, images: imagePaths },
      userId,
    );

    return {
      success: true,
      message: 'Listing created successfully',
      data: listing,
    };
  }

  @Get()
  async findAll(@Query() query: QueryListingsDto, @Req() req: any) {
    const userId = this.getUserIdFromRequest(req, false);
    const result = await this.listingsService.findAll(query, userId ?? undefined);
    return {
      success: true,
      ...result,
    };
  }

  @Get('favorites/all')
  async getFavorites(@Req() req: any) {
    const userId = this.getUserIdFromRequest(req) as number;
    const data = await this.listingsService.getFavorites(userId);
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userId = this.getUserIdFromRequest(req, false);
    const data = await this.listingsService.findOne(parseInt(id), userId ?? undefined);
    return {
      success: true,
      data,
    };
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    const data = await this.listingsService.findByUser(parseInt(userId));
    return {
      success: true,
      data,
    };
  }

  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 10 },
        { name: 'coverImage', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './uploads/listings',
          filename: (req, file, callback) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
          },
        }),
      },
    ),
  )
  async update(
    @Param('id') id: string,
    @Body() updateListingDto: UpdateListingDto,
    @Req() req: any,
    @UploadedFiles()
    files?: { images?: Express.Multer.File[]; coverImage?: Express.Multer.File[] },
  ) {
    const userId = this.getUserIdFromRequest(req) as number;

    // Log raw request body before DTO transform
    console.log('🔴 RAW REQUEST BODY:', req.body);
    console.log('🔴 RAW negotiable:', req.body?.negotiable, 'type:', typeof req.body?.negotiable);

    // MANUAL FIX: Use the raw value and overwrite the DTO
    const rawNegotiable: any = req.body?.negotiable;
    const parsedNegotiable = typeof rawNegotiable === 'boolean' 
      ? rawNegotiable 
      : (typeof rawNegotiable === 'string' 
          ? rawNegotiable.toLowerCase() === 'true' 
          : false);
    
    console.log('🔴 PARSED negotiable:', parsedNegotiable);
    
    // Force update the DTO with correct value
    updateListingDto.negotiable = parsedNegotiable;

    // Process uploaded images if any
    if (files?.images || files?.coverImage) {
      const imagePaths: string[] = [];
      if (files?.images) {
        for (const file of files.images) {
          imagePaths.push(`/uploads/listings/${file.filename}`);
        }
      }
      if (files?.coverImage) {
        imagePaths.unshift(`/uploads/listings/${files.coverImage[0].filename}`);
      }
      updateListingDto.images = imagePaths;
    }

    console.log('📥 Update listing DTO:', updateListingDto);
    console.log('   negotiable value (raw):', updateListingDto.negotiable);
    console.log('   negotiable type:', typeof updateListingDto.negotiable);

    // Manual fix: Parse negotiable properly from form data
    if (updateListingDto.negotiable !== undefined) {
      const rawValue: any = updateListingDto.negotiable;
      updateListingDto.negotiable = rawValue === 'true' || rawValue === true;
      console.log('   negotiable value (fixed):', updateListingDto.negotiable);
    }

    const listing = await this.listingsService.update(
      parseInt(id),
      updateListingDto,
      userId,
    );

    return {
      success: true,
      message: 'Listing updated successfully',
      data: listing,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = this.getUserIdFromRequest(req) as number;
    await this.listingsService.remove(parseInt(id), userId);
    return { success: true, message: 'Listing deleted successfully' };
  }

  @Post(':id/favorite')
  async toggleFavorite(@Param('id') id: string, @Req() req: any) {
    const userId = this.getUserIdFromRequest(req) as number;
    const result = await this.listingsService.toggleFavorite(userId, parseInt(id));
    return { success: true, ...result };
  }

  @Post(':id/report')
  async reportListing(
    @Param('id') id: string,
    @Body() body: { reason: string; description?: string },
    @Req() req: any,
  ) {
    const reporterId = this.getUserIdFromRequest(req) as number;
    const result = await this.listingsService.reportListing(
      parseInt(id),
      reporterId,
      body.reason,
      body.description,
    );
    return { success: true, message: 'Report submitted', data: result };
  }
}
