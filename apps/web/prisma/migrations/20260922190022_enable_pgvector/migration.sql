-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "VectorCheck" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "embedding" vector(3),

    CONSTRAINT "VectorCheck_pkey" PRIMARY KEY ("id")
);
