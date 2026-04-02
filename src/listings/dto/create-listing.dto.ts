import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, MaxLength, Min, IsInt } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateListingDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
  })
  @IsBoolean()
  @IsOptional()
  negotiable?: boolean;

  @IsString()
  categoryId: string;

  @IsString()
  condition: string; // "new", "like-new", "used"

  @IsString()
  location: string;

  @IsString()
  contactPhone: string;

  @IsString()
  contactMethod: string; // "chat", "call"

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  status?: string; // "active", "sold", "inactive"

  // Vehicle specific fields
  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @IsOptional()
  year?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  mileage?: number;

  @IsString()
  @IsOptional()
  transmission?: string; // "automatic", "manual", "cvt"

  @IsString()
  @IsOptional()
  fuelType?: string; // "petrol", "diesel", "hybrid", "electric"

  // Real Estate specific fields
  @IsString()
  @IsOptional()
  propertyType?: string; // "house", "apartment", "land", "commercial", "office"

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  bedrooms?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  bathrooms?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  area?: number;

  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
  })
  @IsBoolean()
  @IsOptional()
  furnished?: boolean;

  @IsString()
  @IsOptional()
  parking?: string;

  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
  })
  @IsBoolean()
  @IsOptional()
  gated?: boolean;

  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
  })
  @IsBoolean()
  @IsOptional()
  tiled?: boolean;

  @IsString()
  @IsOptional()
  ac?: string;

  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
  })
  @IsBoolean()
  @IsOptional()
  ensuite?: boolean;

  @IsString()
  @IsOptional()
  water?: string; // Expecting JSON string

  @IsString()
  @IsOptional()
  amenities?: string; // Expecting JSON string

  @IsString()
  @IsOptional()
  cupboards?: string;

  @IsString()
  @IsOptional()
  village?: string;

  // Jobs specific fields
  @IsString()
  @IsOptional()
  jobType?: string; // "full-time", "part-time", "contract", "internship", "remote"

  @IsString()
  @IsOptional()
  experienceLevel?: string; // "entry", "mid", "senior", "executive"

  @IsString()
  @IsOptional()
  salaryPeriod?: string; // "monthly", "annually", "hourly"

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  currency?: string; // e.g. "TTD", "USD"

  // Map coordinates
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  longitude?: number;
}
