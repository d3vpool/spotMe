/*
  Warnings:

  - You are about to drop the `faceEmbedding` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[shareToken]` on the table `event` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "faceEmbedding" DROP CONSTRAINT "faceEmbedding_imageId_fkey";

-- DropForeignKey
ALTER TABLE "image" DROP CONSTRAINT "image_eventId_fkey";

-- AlterTable
ALTER TABLE "event" ADD COLUMN     "coverImageId" INTEGER;

-- AlterTable
ALTER TABLE "image" ALTER COLUMN "eventId" DROP NOT NULL;

-- DropTable
DROP TABLE "faceEmbedding";

-- CreateTable
CREATE TABLE "FaceEmbedding" (
    "id" SERIAL NOT NULL,
    "imageId" INTEGER NOT NULL,
    "vector" vector(128) NOT NULL,
    "boundingBox" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaceEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_shareToken_key" ON "event"("shareToken");

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image" ADD CONSTRAINT "image_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceEmbedding" ADD CONSTRAINT "FaceEmbedding_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
