-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "providerIntentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerIntentId_key" ON "Payment"("providerIntentId");

