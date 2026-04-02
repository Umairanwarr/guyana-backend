-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "area" DOUBLE PRECISION,
ADD COLUMN     "bathrooms" INTEGER,
ADD COLUMN     "bedrooms" INTEGER,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "fuelType" TEXT,
ADD COLUMN     "furnished" BOOLEAN,
ADD COLUMN     "mileage" INTEGER,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "propertyType" TEXT,
ADD COLUMN     "transmission" TEXT,
ADD COLUMN     "year" INTEGER;

-- CreateIndex
CREATE INDEX "Listing_brand_idx" ON "Listing"("brand");

-- CreateIndex
CREATE INDEX "Listing_propertyType_idx" ON "Listing"("propertyType");
