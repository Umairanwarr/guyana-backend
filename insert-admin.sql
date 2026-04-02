-- Add isAdmin column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'User' AND column_name = 'isAdmin') THEN
        ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Insert or update admin user
INSERT INTO "User" (email, password, "isAdmin", "isVerified", name, "createdAt", "updatedAt")
VALUES ('gycentral592@gmail.com', '$2b$10$WXAZz2K3gMzYLhTsSR0eNuOZdBKINL//i7kTFiEfqL6EdaECR6Uje', true, true, 'Admin User', NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET "isAdmin" = true, password = '$2b$10$WXAZz2K3gMzYLhTsSR0eNuOZdBKINL//i7kTFiEfqL6EdaECR6Uje', "isVerified" = true;
