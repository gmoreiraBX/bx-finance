-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isFixed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referenceMonth" TIMESTAMP(3);
