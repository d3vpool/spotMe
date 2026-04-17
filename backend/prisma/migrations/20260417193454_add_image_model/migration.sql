/*
  Warnings:

  - Changed the type of `createdBy` on the `event` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "event" DROP COLUMN "createdBy",
ADD COLUMN     "createdBy" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "image" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "eventId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "image" ADD CONSTRAINT "image_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
