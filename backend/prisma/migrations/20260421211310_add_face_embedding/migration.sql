-- CreateTable
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "faceEmbedding" (
    "id" SERIAL NOT NULL,
    "imageId" INTEGER NOT NULL,
    "vector" vector(128) NOT NULL,
    "boundingBox" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faceEmbedding_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "faceEmbedding" ADD CONSTRAINT "faceEmbedding_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
