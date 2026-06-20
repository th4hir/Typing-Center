-- CreateTable
CREATE TABLE "applications" (
    "id" SERIAL NOT NULL,
    "customer_name" TEXT NOT NULL,
    "emirates_id" TEXT NOT NULL,
    "service_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "offline_sync_flag" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);
