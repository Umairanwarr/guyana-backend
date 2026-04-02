import { PartialType } from '@nestjs/mapped-types';
import { CreateListingDto } from './create-listing.dto';
import { IsArray, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateListingDto extends PartialType(CreateListingDto) {
  @IsArray()
  @IsOptional()
  images?: string[];

  // Explicitly override negotiable to ensure proper transform
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
  })
  @IsBoolean()
  @IsOptional()
  negotiable?: boolean;
}
