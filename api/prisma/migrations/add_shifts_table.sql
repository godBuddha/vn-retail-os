-- Migration: Add shifts table
-- Run this in your PostgreSQL container or via Docker exec

CREATE TABLE IF NOT EXISTS "shifts" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "openingCash" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "closingCash" DECIMAL(15,2),
  "totalSales" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "totalOrders" INTEGER NOT NULL DEFAULT 0,
  "cashSales" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "transferSales" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "note" TEXT,
  "openedById" TEXT NOT NULL,
  "closedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "shifts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shifts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "shifts_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "shifts_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "shifts_branchId_idx" ON "shifts"("branchId");
CREATE INDEX IF NOT EXISTS "shifts_status_idx" ON "shifts"("status");
