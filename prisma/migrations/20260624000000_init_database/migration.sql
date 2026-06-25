-- CreateTable
CREATE TABLE "ShopConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "shopName" TEXT NOT NULL DEFAULT 'Typing Center',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ShopConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isTravel" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCard" (
    "id" SERIAL NOT NULL,
    "bankName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPersonal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PaymentCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "advanceBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyRecord" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL DEFAULT '',
    "documentNumber" TEXT NOT NULL DEFAULT '',
    "documentType" TEXT NOT NULL DEFAULT '',
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Active',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Individual" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "advanceBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Individual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndividualRecord" (
    "id" SERIAL NOT NULL,
    "individualId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "holderName" TEXT NOT NULL DEFAULT '',
    "documentNumber" TEXT NOT NULL DEFAULT '',
    "documentType" TEXT NOT NULL DEFAULT '',
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Active',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndividualRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" SERIAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "emiratesId" TEXT NOT NULL DEFAULT '',
    "customerType" TEXT NOT NULL DEFAULT 'Individual',
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "serviceId" INTEGER NOT NULL,
    "serviceCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerPayment" TEXT NOT NULL DEFAULT 'Cash',
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cardReceiptNet" DOUBLE PRECISION DEFAULT 0,
    "receivingAccount" TEXT,
    "settlementNote" TEXT DEFAULT '',
    "govtFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "govtPayment" TEXT NOT NULL DEFAULT 'Cash',
    "govtEntity" TEXT NOT NULL DEFAULT '',
    "govtPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "typingFee" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Staff',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'Cash',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovtEntity" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "GovtEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovtEntityPayment" (
    "id" SERIAL NOT NULL,
    "entityName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'Cash',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovtEntityPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelSupplier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TravelSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelSupplierPayment" (
    "id" SERIAL NOT NULL,
    "supplierName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'Cash',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelSupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountTransfer" (
    "id" SERIAL NOT NULL,
    "fromAccount" TEXT NOT NULL,
    "toAccount" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCard_bankName_key" ON "PaymentCard"("bankName");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Individual_name_key" ON "Individual"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "GovtEntity_name_key" ON "GovtEntity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TravelSupplier_name_key" ON "TravelSupplier"("name");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyRecord" ADD CONSTRAINT "CompanyRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualRecord" ADD CONSTRAINT "IndividualRecord_individualId_fkey" FOREIGN KEY ("individualId") REFERENCES "Individual"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
