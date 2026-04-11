-- AddColumn googleAccessToken to User
ALTER TABLE "User" ADD COLUMN "googleAccessToken" TEXT;

-- AddColumn googleRefreshToken to User
ALTER TABLE "User" ADD COLUMN "googleRefreshToken" TEXT;

-- AddColumn googleTokenExpiry to User
ALTER TABLE "User" ADD COLUMN "googleTokenExpiry" TIMESTAMP(3);

-- AddColumn contacts to Note
ALTER TABLE "Note" ADD COLUMN "contacts" JSONB NOT NULL DEFAULT '[]';
