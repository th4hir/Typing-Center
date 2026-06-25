import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import fs from 'fs'

const DEFAULT_DB_URL = "postgresql://postgres:admin@localhost:5432/typing_center_db?connect_timeout=5"

function ensureConnectTimeout(url) {
  try {
    const u = new URL(url)
    if (!u.searchParams.has('connect_timeout')) {
      u.searchParams.set('connect_timeout', '5')
    }
    return u.toString()
  } catch {
    // If URL parsing fails, just append it
    return url + (url.includes('?') ? '&' : '?') + 'connect_timeout=5'
  }
}

function getDatabaseUrl() {
  const configPath = join(app.getPath('userData'), 'db-config.json')
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      if (data && data.databaseUrl) {
        return ensureConnectTimeout(data.databaseUrl)
      }
    }
  } catch (err) {
    console.error('Error reading db-config.json:', err)
  }
  
  try {
    fs.writeFileSync(configPath, JSON.stringify({ databaseUrl: DEFAULT_DB_URL }, null, 2))
  } catch (err) {
    console.error('Error writing default db-config.json:', err)
  }
  
  return DEFAULT_DB_URL
}

const loadedDbUrl = getDatabaseUrl()
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: loadedDbUrl
    }
  }
})

async function runPrismaMigrations() {
  const logPath = join(app.getPath('userData'), 'migration.log')
  const log = (msg) => {
    const formattedMsg = `[${new Date().toISOString()}] ${msg}`
    console.log(formattedMsg)
    try { fs.appendFileSync(logPath, formattedMsg + '\n', 'utf8') } catch (e) {}
  }

  log('=== Starting migrations ===')
  const migrationsPath = join(app.getAppPath(), 'prisma/migrations')
  log(`Migrations path: ${migrationsPath}`)
  if (!fs.existsSync(migrationsPath)) {
    log(`No migrations folder found at: ${migrationsPath}`)
    return
  }

  try {
    log('Ensuring _prisma_migrations table exists...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) PRIMARY KEY NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      );
    `)

    const items = fs.readdirSync(migrationsPath)
    const migrationDirs = items
      .filter(item => {
        const itemPath = join(migrationsPath, item)
        return fs.statSync(itemPath).isDirectory() && fs.existsSync(join(itemPath, 'migration.sql'))
      })
      .sort()

    log(`Found ${migrationDirs.length} migrations: ${JSON.stringify(migrationDirs)}`)

    for (const dirName of migrationDirs) {
      log(`Checking if migration "${dirName}" is already applied...`)
      const alreadyApplied = await prisma.$queryRawUnsafe(
        `SELECT id, finished_at FROM "_prisma_migrations" WHERE "migration_name" = '${dirName}' AND "finished_at" IS NOT NULL`
      )

      if (alreadyApplied && alreadyApplied.length > 0) {
        log(`Migration "${dirName}" is already applied.`)
        continue
      }

      log(`Applying migration: ${dirName}`)
      const sqlPath = join(migrationsPath, dirName, 'migration.sql')
      const sqlContent = fs.readFileSync(sqlPath, 'utf8')
      const checksum = crypto.createHash('sha256').update(sqlContent).digest('hex')

      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(sqlContent)
        const migrationId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex')
        await tx.$executeRawUnsafe(`
          INSERT INTO "_prisma_migrations" (
            "id", "checksum", "finished_at", "migration_name", "applied_steps_count"
          ) VALUES (
            '${migrationId}', '${checksum}', now(), '${dirName}', 1
          )
        `)
      })
      log(`Successfully applied migration: ${dirName}`)
    }
    log('=== Migrations finished successfully ===')
  } catch (err) {
    log(`Prisma migrations failed: ${err.stack || err.message}`)
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, storedValue) {
  if (!storedValue || !storedValue.includes(':')) return false
  const [salt, hash] = storedValue.split(':')
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return hash === verifyHash
}


// ═══════════════════════════════════════════════════════════════
//  SHOP CONFIG
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('get-shop-config', async () => {
  try {
    const config = await prisma.shopConfig.findUnique({ where: { id: 1 } })
    return { success: true, data: config }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('save-shop-config', async (_event, data) => {
  try {
    const config = await prisma.shopConfig.upsert({
      where: { id: 1 },
      update: { shopName: data.shopName, address: data.address || '', phone: data.phone || '' },
      create: { id: 1, shopName: data.shopName, address: data.address || '', phone: data.phone || '' }
    })
    return { success: true, data: config }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════
//  CATEGORIES
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('get-categories', async () => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } })
    return { success: true, data: categories }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('create-category', async (_event, data) => {
  try {
    const category = await prisma.category.create({
      data: {
        name: data.name,
        isTravel: data.isTravel || false
      }
    })
    return { success: true, data: category }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-category', async (_event, data) => {
  try {
    const id = parseInt(data.id, 10)
    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) return { success: false, error: 'Category not found.' }
    if (existing.name === 'System') return { success: false, error: 'Cannot edit the System category.' }

    const updated = await prisma.category.update({
      where: { id },
      data: { name: data.name }
    })
    return { success: true, data: updated }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-category', async (_event, { id }) => {
  try {
    const catId = parseInt(id, 10)
    const existing = await prisma.category.findUnique({ where: { id: catId } })
    if (!existing) return { success: false, error: 'Category not found.' }
    if (existing.name === 'System') return { success: false, error: 'Cannot delete the System category.' }

    // Check if services are linked
    const linkedServices = await prisma.service.findFirst({ where: { categoryId: catId } })
    if (linkedServices) {
      return { success: false, error: 'Cannot delete category because it has services linked to it. Please delete the services first.' }
    }

    await prisma.category.delete({ where: { id: catId } })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════
//  GOVERNMENT ENTITIES
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('get-govt-entities', async () => {
  try {
    const entities = await prisma.govtEntity.findMany({ orderBy: { name: 'asc' } })
    return { success: true, data: entities }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('create-govt-entity', async (_event, data) => {
  try {
    const entity = await prisma.govtEntity.create({ data: { name: data.name } })
    return { success: true, data: entity }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-govt-entity', async (_event, data) => {
  try {
    const entity = await prisma.govtEntity.update({
      where: { id: data.id },
      data: { name: data.name }
    })
    return { success: true, data: entity }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-govt-entity', async (_event, data) => {
  try {
    const entity = await prisma.govtEntity.delete({
      where: { id: data.id }
    })
    return { success: true, data: entity }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════
//  TRAVEL SUPPLIERS
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('get-travel-suppliers', async () => {
  try {
    const suppliers = await prisma.travelSupplier.findMany({ orderBy: { name: 'asc' } })
    return { success: true, data: suppliers }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('create-travel-supplier', async (_event, data) => {
  try {
    const supplier = await prisma.travelSupplier.create({ data: { name: data.name } })
    return { success: true, data: supplier }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-travel-supplier', async (_event, data) => {
  try {
    const supplier = await prisma.travelSupplier.update({
      where: { id: data.id },
      data: { name: data.name }
    })
    return { success: true, data: supplier }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-travel-supplier', async (_event, data) => {
  try {
    const supplier = await prisma.travelSupplier.delete({
      where: { id: data.id }
    })
    return { success: true, data: supplier }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════
//  SERVICES
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('get-services', async () => {
  try {
    const services = await prisma.service.findMany({
      include: { category: true },
      orderBy: { id: 'asc' }
    })
    return { success: true, data: services }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('create-service', async (_event, data) => {
  try {
    const service = await prisma.service.create({
      data: { name: data.name, price: data.price, categoryId: data.categoryId },
      include: { category: true }
    })
    return { success: true, data: service }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-advance-deposit-service', async () => {
  try {
    const systemCategory = await prisma.category.findUnique({ where: { name: 'System' } })
    if (!systemCategory) return { success: false, error: 'System category not found' }

    const service = await prisma.service.findFirst({
      where: {
        name: 'Advance Deposit',
        categoryId: systemCategory.id
      },
      include: { category: true }
    })
    if (!service) return { success: false, error: 'Advance Deposit service not found' }

    return { success: true, data: service }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════
//  PAYMENT CARDS
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('get-payment-cards', async () => {
  try {
    const cards = await prisma.paymentCard.findMany({ orderBy: { bankName: 'asc' } })
    return { success: true, data: cards }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('create-payment-card', async (_event, data) => {
  try {
    const card = await prisma.paymentCard.create({
      data: {
        bankName: data.bankName,
        isActive: true,
        isPersonal: data.isPersonal || false
      }
    })
    return { success: true, data: card }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('toggle-payment-card', async (_event, data) => {
  try {
    const card = await prisma.paymentCard.update({
      where: { id: data.id },
      data: { isActive: data.isActive }
    })
    return { success: true, data: card }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════
//  COMPANIES
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('get-companies', async () => {
  try {
    const companies = await prisma.company.findMany({ orderBy: { name: 'asc' } })
    return { success: true, data: companies }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('create-company', async (_event, data) => {
  try {
    const company = await prisma.company.create({ data: { name: data.name } })
    return { success: true, data: company }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-company', async (_event, data) => {
  try {
    const company = await prisma.company.update({
      where: { id: data.id },
      data: { name: data.name }
    })
    return { success: true, data: company }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-company', async (_event, { id }) => {
  try {
    await prisma.company.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('adjust-company-advance', async (_event, { id, amount }) => {
  try {
    const company = await prisma.company.update({
      where: { id: parseInt(id, 10) },
      data: { advanceBalance: { increment: parseFloat(amount) || 0 } }
    })
    return { success: true, data: company }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-company-records', async (_event, { companyId }) => {
  try {
    const records = await prisma.companyRecord.findMany({
      where: { companyId: parseInt(companyId, 10) },
      orderBy: { expiryDate: 'asc' }
    })
    return { success: true, data: records }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('create-company-record', async (_event, data) => {
  try {
    const record = await prisma.companyRecord.create({
      data: {
        companyId: parseInt(data.companyId, 10),
        category: data.category,
        employeeName: data.employeeName || '',
        documentNumber: data.documentNumber || '',
        documentType: data.documentType || '',
        issueDate: data.issueDate ? new Date(data.issueDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        status: data.status || 'Active',
        notes: data.notes || ''
      }
    })
    return { success: true, data: record }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-company-record', async (_event, data) => {
  try {
    const record = await prisma.companyRecord.update({
      where: { id: data.id },
      data: {
        category: data.category,
        employeeName: data.employeeName || '',
        documentNumber: data.documentNumber || '',
        documentType: data.documentType || '',
        issueDate: data.issueDate ? new Date(data.issueDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        status: data.status || 'Active',
        notes: data.notes || ''
      }
    })
    return { success: true, data: record }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-company-record', async (_event, { id }) => {
  try {
    await prisma.companyRecord.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════
//  INDIVIDUALS
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('get-individuals', async () => {
  try {
    const individuals = await prisma.individual.findMany({ orderBy: { name: 'asc' } })
    return { success: true, data: individuals }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('create-individual', async (_event, data) => {
  try {
    const individual = await prisma.individual.create({
      data: {
        name: data.name,
        phone: data.phone || ''
      }
    })
    return { success: true, data: individual }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-individual', async (_event, data) => {
  try {
    const individual = await prisma.individual.update({
      where: { id: data.id },
      data: {
        name: data.name,
        phone: data.phone || ''
      }
    })
    return { success: true, data: individual }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-individual', async (_event, { id }) => {
  try {
    await prisma.individual.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('adjust-individual-advance', async (_event, { id, amount }) => {
  try {
    const individual = await prisma.individual.update({
      where: { id: parseInt(id, 10) },
      data: { advanceBalance: { increment: parseFloat(amount) || 0 } }
    })
    return { success: true, data: individual }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-individual-records', async (_event, { individualId }) => {
  try {
    const records = await prisma.individualRecord.findMany({
      where: { individualId: parseInt(individualId, 10) },
      orderBy: { expiryDate: 'asc' }
    })
    return { success: true, data: records }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('create-individual-record', async (_event, data) => {
  try {
    const record = await prisma.individualRecord.create({
      data: {
        individualId: parseInt(data.individualId, 10),
        category: data.category,
        holderName: data.holderName || '',
        documentNumber: data.documentNumber || '',
        documentType: data.documentType || '',
        issueDate: data.issueDate ? new Date(data.issueDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        status: data.status || 'Active',
        notes: data.notes || ''
      }
    })
    return { success: true, data: record }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-individual-record', async (_event, data) => {
  try {
    const record = await prisma.individualRecord.update({
      where: { id: data.id },
      data: {
        category: data.category,
        holderName: data.holderName || '',
        documentNumber: data.documentNumber || '',
        documentType: data.documentType || '',
        issueDate: data.issueDate ? new Date(data.issueDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        status: data.status || 'Active',
        notes: data.notes || ''
      }
    })
    return { success: true, data: record }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-individual-record', async (_event, { id }) => {
  try {
    await prisma.individualRecord.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════
//  APPLICATIONS (SALES)
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('get-applications', async () => {
  try {
    const applications = await prisma.application.findMany({
      include: { service: { include: { category: true } } },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, data: applications }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

async function adjustCustomerAdvanceBalance(customerType, identifier, serviceCharge, operation, phone = '') {
  const amount = parseFloat(serviceCharge) || 0
  if (amount <= 0 || !identifier) return

  try {
    if (customerType === 'Company') {
      const comp = await prisma.company.findUnique({ where: { name: identifier } })
      if (comp) {
        await prisma.company.update({
          where: { id: comp.id },
          data: {
            advanceBalance: operation === 'decrement'
              ? { decrement: amount }
              : { increment: amount }
          }
        })
      }
    } else {
      // Individual
      let ind = await prisma.individual.findUnique({ where: { name: identifier } })
      if (!ind) {
        ind = await prisma.individual.create({
          data: {
            name: identifier,
            phone: phone || ''
          }
        })
      }
      await prisma.individual.update({
        where: { id: ind.id },
        data: {
          advanceBalance: operation === 'decrement'
            ? { decrement: amount }
            : { increment: amount }
        }
      })
    }
  } catch (err) {
    console.error('Failed to adjust customer advance balance:', err)
  }
}

ipcMain.handle('create-application', async (_event, data) => {
  try {
    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
      include: { category: true }
    })
    const isAdvanceDeposit = service?.name === 'Advance Deposit' && service?.category?.name === 'System'

    const typingFee = isAdvanceDeposit ? 0 : (data.typingFee || 0)

    // Auto-detect if customer has advance balance and deduct from it
    if (!isAdvanceDeposit) {
      const identifier = data.customerType === 'Company' ? data.emiratesId : data.customerName
      let customerAdvance = 0
      if (data.customerType === 'Company' && identifier) {
        const comp = await prisma.company.findUnique({ where: { name: identifier } })
        if (comp) customerAdvance = comp.advanceBalance || 0
      } else if (identifier) {
        const ind = await prisma.individual.findUnique({ where: { name: identifier } })
        if (ind) customerAdvance = ind.advanceBalance || 0
      }
      if (customerAdvance > 0) {
        data.customerPayment = 'Advance'
        data.paidAmount = data.serviceCharge || 0
        data.balance = 0
      }
    }

    const application = await prisma.application.create({
      data: {
        customerName: data.customerName,
        phone: data.phone || '',
        emiratesId: data.emiratesId || '',
        customerType: data.customerType || 'Individual',
        serviceId: data.serviceId,
        serviceCharge: data.serviceCharge || 0,
        customerPayment: data.customerPayment || 'Cash',
        paidAmount: isAdvanceDeposit ? (data.paidAmount || data.serviceCharge || 0) : (data.paidAmount || 0),
        balance: data.balance || 0,
        cardReceiptNet: data.cardReceiptNet !== undefined ? parseFloat(data.cardReceiptNet) : 0,
        receivingAccount: data.receivingAccount || null,
        govtFee: isAdvanceDeposit ? 0 : (data.govtFee || 0),
        govtPayment: isAdvanceDeposit ? 'N/A' : (data.govtPayment || 'Cash'),
        govtEntity: isAdvanceDeposit ? '' : (data.govtEntity || ''),
        govtPaid: isAdvanceDeposit ? 0 : (data.govtPaid || 0),
        typingFee: typingFee,
        status: data.status || 'Pending',
        createdBy: data.createdBy || ''
      },
      include: { service: { include: { category: true } } }
    })

    const identifier = data.customerType === 'Company' ? data.emiratesId : data.customerName
    if (isAdvanceDeposit) {
      const amount = data.paidAmount !== undefined ? data.paidAmount : data.serviceCharge
      await adjustCustomerAdvanceBalance(data.customerType, identifier, amount, 'increment', data.phone)
    } else if (data.customerPayment === 'Advance') {
      const amount = data.serviceCharge || 0
      await adjustCustomerAdvanceBalance(data.customerType, identifier, amount, 'decrement', data.phone)
    }

    // Auto-save individual with balance/credit to Individual Directory
    if (application.customerType === 'Individual' && (application.balance > 0 || application.customerPayment === 'Credit')) {
      const name = application.customerName.trim()
      try {
        const existing = await prisma.individual.findUnique({ where: { name } })
        if (!existing) {
          await prisma.individual.create({
            data: {
              name,
              phone: application.phone || ''
            }
          })
        }
      } catch (err) {
        console.error('Failed to auto-save individual to directory:', err)
      }
    }

    return { success: true, data: application }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════
//  DAILY REPORT
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('get-daily-report', async (_event, data) => {
  try {
    const dateStr = data.date // "YYYY-MM-DD"
    const [year, month, day] = dateStr.split('-').map(Number)
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)

    const applications = await prisma.application.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay }
      },
      include: { service: { include: { category: true } } },
      orderBy: { createdAt: 'asc' }
    })

    return { success: true, data: applications }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════
//  CARD ACCOUNTS — aggregated spending per card
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('get-card-accounts', async (_event, data) => {
  try {
    const where = {}
    if (data && data.startDate && data.endDate) {
      const [sYear, sMonth, sDay] = data.startDate.split('-').map(Number)
      const [eYear, eMonth, eDay] = data.endDate.split('-').map(Number)
      where.createdAt = {
        gte: new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0),
        lte: new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999)
      }
    }

    const applications = await prisma.application.findMany({ where })

    // Get all cards
    const cards = await prisma.paymentCard.findMany({ orderBy: { bankName: 'asc' } })

    // Build summary per card
    const cardSummary = cards.map((card) => {
      // Money received from customers via this card
      const receivedApps = applications.filter(a => a.customerPayment === card.bankName)
      const totalReceived = receivedApps.reduce((sum, a) => sum + a.serviceCharge, 0)

      // Money paid to govt via this card
      const paidApps = applications.filter(a => a.govtPayment === card.bankName)
      const totalPaid = paidApps.reduce((sum, a) => sum + a.govtFee, 0)

      return {
        id: card.id,
        bankName: card.bankName,
        isActive: card.isActive,
        totalReceived,
        receivedCount: receivedApps.length,
        totalPaid,
        paidCount: paidApps.length,
        netBalance: totalReceived - totalPaid
      }
    })

    // Cash summary
    const cashReceivedApps = applications.filter(a => a.customerPayment === 'Cash')
    const cashPaidApps = applications.filter(a => a.govtPayment === 'Cash')
    const cashSummary = {
      bankName: 'Cash',
      totalReceived: cashReceivedApps.reduce((sum, a) => sum + a.serviceCharge, 0),
      receivedCount: cashReceivedApps.length,
      totalPaid: cashPaidApps.reduce((sum, a) => sum + a.govtFee, 0),
      paidCount: cashPaidApps.length,
    }
    cashSummary.netBalance = cashSummary.totalReceived - cashSummary.totalPaid

    return { success: true, data: { cards: cardSummary, cash: cashSummary } }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════
//  ACCOUNTS — cash flow & transfers
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('get-accounts', async (_event, data) => {
  try {
    const cards = await prisma.paymentCard.findMany({ orderBy: { bankName: 'asc' } })

    // Fetch all-time data to calculate running balances
    const allApps = await prisma.application.findMany()
    const allExpenses = await prisma.expense.findMany()
    const allEntityPayments = await prisma.govtEntityPayment.findMany()
    const allSupplierPayments = await prisma.travelSupplierPayment.findMany()
    const allTransfers = await prisma.accountTransfer.findMany()

    // Compute running balances
    const balances = {}
    balances['Cash'] = { received: 0, paid: 0, balance: 0 }
    cards.forEach(c => {
      balances[c.bankName] = { received: 0, paid: 0, balance: 0 }
    })

    const companyCards = cards.filter(c => !c.isPersonal && c.isActive)
    const primaryCompanyCard = companyCards.length > 0 ? companyCards[0].bankName : null

    // Inflows from applications
    allApps.forEach(a => {
      const pm = a.customerPayment
      const paidAmt = a.paidAmount || 0
      const recAcc = a.receivingAccount
      const netCard = a.cardReceiptNet || 0

      if (pm === 'Cash') {
        balances['Cash'].received += paidAmt
      } else if (pm === 'Card') {
        if (recAcc && balances[recAcc]) {
          balances[recAcc].received += netCard > 0 ? netCard : paidAmt
        }
      } else if (pm === 'Account Transfer' || pm === 'Cheque') {
        const targetCard = recAcc || primaryCompanyCard
        if (targetCard && balances[targetCard]) {
          balances[targetCard].received += paidAmt
        } else {
          balances['Cash'].received += paidAmt
        }
      } else if (balances[pm]) {
        balances[pm].received += paidAmt
      }
    })

    // Outflows from applications
    allApps.forEach(a => {
      const govtPay = a.govtPayment
      const govtFee = a.govtFee || 0
      if (govtPay === 'Cash') {
        balances['Cash'].paid += govtFee
      } else if (balances[govtPay]) {
        balances[govtPay].paid += govtFee
      }
    })

    // Outflows from expenses
    allExpenses.forEach(e => {
      const pm = e.paymentMethod
      const amt = e.amount || 0
      if (pm === 'Cash') {
        balances['Cash'].paid += amt
      } else if (balances[pm]) {
        balances[pm].paid += amt
      }
    })

    // Outflows from govt entity payments
    allEntityPayments.forEach(p => {
      const pm = p.paymentMethod
      const amt = p.amount || 0
      if (pm === 'Cash') {
        balances['Cash'].paid += amt
      } else if (balances[pm]) {
        balances[pm].paid += amt
      }
    })

    // Outflows from supplier payouts
    allSupplierPayments.forEach(p => {
      const pm = p.paymentMethod
      const amt = p.amount || 0
      if (pm === 'Cash') {
        balances['Cash'].paid += amt
      } else if (balances[pm]) {
        balances[pm].paid += amt
      }
    })

    // Transfers
    allTransfers.forEach(t => {
      const from = t.fromAccount
      const to = t.toAccount
      const amt = t.amount || 0

      if (balances[from]) {
        balances[from].paid += amt
      }
      if (balances[to]) {
        balances[to].received += amt
      }
    })

    // Finalize net balances
    balances['Cash'].balance = balances['Cash'].received - balances['Cash'].paid
    cards.forEach(c => {
      balances[c.bankName].balance = balances[c.bankName].received - balances[c.bankName].paid
    })

    // Fetch range filtered transactions for the ledger
    const ledgerWhere = {}
    if (data && data.startDate && data.endDate) {
      const [sYear, sMonth, sDay] = data.startDate.split('-').map(Number)
      const [eYear, eMonth, eDay] = data.endDate.split('-').map(Number)
      ledgerWhere.createdAt = {
        gte: new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0),
        lte: new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999)
      }
    }

    const rangeApps = await prisma.application.findMany({ where: ledgerWhere, include: { service: { include: { category: true } } } })
    const rangeExpenses = await prisma.expense.findMany({ where: ledgerWhere })
    const rangeEntityPayments = await prisma.govtEntityPayment.findMany({ where: ledgerWhere })
    const rangeSupplierPayments = await prisma.travelSupplierPayment.findMany({ where: ledgerWhere })
    const rangeTransfers = await prisma.accountTransfer.findMany({ where: ledgerWhere })

    const personalCardNames = new Set(cards.filter(c => c.isPersonal).map(c => c.bankName))
    const personalEntityPayments = allEntityPayments.filter(p => personalCardNames.has(p.paymentMethod))
    const personalTransfers = allTransfers.filter(t => personalCardNames.has(t.toAccount))

    const unsettledCardApps = await prisma.application.findMany({
      where: {
        customerPayment: 'Card',
        OR: [
          { receivingAccount: null },
          { receivingAccount: '' }
        ]
      },
      include: { service: { include: { category: true } } },
      orderBy: { createdAt: 'desc' }
    })

    return {
      success: true,
      data: {
        cards,
        balances,
        unsettledCardApps,
        ledger: {
          applications: rangeApps,
          expenses: rangeExpenses,
          entityPayments: rangeEntityPayments,
          supplierPayments: rangeSupplierPayments,
          transfers: rangeTransfers,
          personalEntityPayments,
          personalTransfers
        }
      }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('create-account-transfer', async (_event, data) => {
  try {
    const transfer = await prisma.accountTransfer.create({
      data: {
        fromAccount: data.fromAccount,
        toAccount: data.toAccount,
        amount: parseFloat(data.amount) || 0,
        notes: data.notes || '',
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
      }
    })
    return { success: true, data: transfer }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-account-transfer', async (_event, { id }) => {
  try {
    await prisma.accountTransfer.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-card-receipt-net', async (_event, { id, amount }) => {
  try {
    const app = await prisma.application.update({
      where: { id: parseInt(id, 10) },
      data: { cardReceiptNet: parseFloat(amount) || 0 }
    })
    return { success: true, data: app }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════
//  USER AUTH & STAFF MANAGEMENT
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('login', async (_event, { username, password }) => {
  try {
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      return { success: false, error: 'Invalid username or password' }
    }
    if (!user.isActive) {
      return { success: false, error: 'Account is disabled. Please contact Admin.' }
    }
    if (!verifyPassword(password, user.password)) {
      return { success: false, error: 'Invalid username or password' }
    }
    const { password: _, ...safeUser } = user
    return { success: true, data: safeUser }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-users', async () => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { username: 'asc' }
    })
    const safeUsers = users.map(({ password, ...user }) => user)
    return { success: true, data: safeUsers }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('create-user', async (_event, data) => {
  try {
    const existing = await prisma.user.findUnique({ where: { username: data.username } })
    if (existing) {
      return { success: false, error: 'Username already exists' }
    }
    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: hashPassword(data.password),
        fullName: data.fullName,
        role: data.role || 'Staff',
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    })
    const { password, ...safeUser } = user
    return { success: true, data: safeUser }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-user', async (_event, data) => {
  try {
    const updateData = {
      fullName: data.fullName,
      role: data.role,
      isActive: data.isActive
    }
    if (data.password && data.password.trim() !== '') {
      updateData.password = hashPassword(data.password)
    }
    const user = await prisma.user.update({
      where: { id: data.id },
      data: updateData
    })
    const { password, ...safeUser } = user
    return { success: true, data: safeUser }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('toggle-user-status', async (_event, { id, isActive }) => {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { isActive }
    })
    const { password, ...safeUser } = user
    return { success: true, data: safeUser }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-service', async (_event, data) => {
  try {
    const service = await prisma.service.update({
      where: { id: data.id },
      data: {
        name: data.name,
        price: parseFloat(data.price),
        categoryId: parseInt(data.categoryId, 10)
      },
      include: { category: true }
    })
    return { success: true, data: service }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-payment-card', async (_event, data) => {
  try {
    const card = await prisma.paymentCard.update({
      where: { id: data.id },
      data: {
        bankName: data.bankName,
        isPersonal: data.isPersonal !== undefined ? data.isPersonal : undefined
      }
    })
    return { success: true, data: card }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-payment-card', async (_event, { id }) => {
  try {
    await prisma.paymentCard.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-service', async (_event, { id }) => {
  try {
    const count = await prisma.application.count({ where: { serviceId: id } })
    if (count > 0) {
      return { success: false, error: 'Cannot delete service because it has associated customer applications. You can edit it instead.' }
    }
    await prisma.service.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-application', async (_event, data) => {
  try {
    const oldApp = await prisma.application.findUnique({
      where: { id: data.id },
      include: { service: { include: { category: true } } }
    })

    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
      include: { category: true }
    })
    const isAdvanceDeposit = service?.name === 'Advance Deposit' && service?.category?.name === 'System'
    const typingFee = isAdvanceDeposit ? 0 : (data.typingFee || 0)

    // Auto-detect if customer has advance balance and deduct from it
    if (!isAdvanceDeposit) {
      const identifier = data.customerType === 'Company' ? data.emiratesId : data.customerName
      let customerAdvance = 0
      if (data.customerType === 'Company' && identifier) {
        const comp = await prisma.company.findUnique({ where: { name: identifier } })
        if (comp) customerAdvance = comp.advanceBalance || 0
      } else if (identifier) {
        const ind = await prisma.individual.findUnique({ where: { name: identifier } })
        if (ind) customerAdvance = ind.advanceBalance || 0
      }
      // Account for the old advance that will be reverted
      if (oldApp && oldApp.customerPayment === 'Advance') {
        const oldIsAdv = oldApp.service?.name === 'Advance Deposit' && oldApp.service?.category?.name === 'System'
        if (!oldIsAdv) customerAdvance += (oldApp.serviceCharge || 0)
      }
      if (customerAdvance > 0) {
        data.customerPayment = 'Advance'
        data.paidAmount = data.serviceCharge || 0
        data.balance = 0
      }
    }

    const application = await prisma.application.update({
      where: { id: data.id },
      data: {
        customerName: data.customerName,
        phone: data.phone || '',
        emiratesId: data.emiratesId || '',
        customerType: data.customerType || 'Individual',
        serviceId: data.serviceId,
        serviceCharge: data.serviceCharge || 0,
        customerPayment: data.customerPayment || 'Cash',
        paidAmount: isAdvanceDeposit ? (data.paidAmount || data.serviceCharge || 0) : (data.paidAmount || 0),
        balance: data.balance || 0,
        cardReceiptNet: data.cardReceiptNet !== undefined ? parseFloat(data.cardReceiptNet) : 0,
        receivingAccount: data.receivingAccount || null,
        govtFee: isAdvanceDeposit ? 0 : (data.govtFee || 0),
        govtPayment: isAdvanceDeposit ? 'N/A' : (data.govtPayment || 'Cash'),
        govtEntity: isAdvanceDeposit ? '' : (data.govtEntity || ''),
        govtPaid: isAdvanceDeposit ? 0 : (data.govtPaid || 0),
        typingFee: typingFee,
        status: data.status || 'Pending'
      },
      include: { service: { include: { category: true } } }
    })

    if (oldApp) {
      // 1. Revert old balance effect
      const oldIsAdvanceDeposit = oldApp.service?.name === 'Advance Deposit' && oldApp.service?.category?.name === 'System'
      const oldIdentifier = oldApp.customerType === 'Company' ? oldApp.emiratesId : oldApp.customerName
      const oldAmount = oldApp.customerPayment === 'Advance' && !oldIsAdvanceDeposit
        ? (oldApp.serviceCharge || 0)
        : (oldIsAdvanceDeposit ? (oldApp.paidAmount || oldApp.serviceCharge) : 0)

      if (oldIsAdvanceDeposit) {
        await adjustCustomerAdvanceBalance(oldApp.customerType, oldIdentifier, oldAmount, 'decrement', oldApp.phone)
      } else if (oldApp.customerPayment === 'Advance') {
        await adjustCustomerAdvanceBalance(oldApp.customerType, oldIdentifier, oldAmount, 'increment', oldApp.phone)
      }

      // 2. Apply new balance effect
      const newIdentifier = application.customerType === 'Company' ? application.emiratesId : application.customerName
      if (isAdvanceDeposit) {
        const newAmount = application.paidAmount || application.serviceCharge
        await adjustCustomerAdvanceBalance(application.customerType, newIdentifier, newAmount, 'increment', data.phone)
      } else if (application.customerPayment === 'Advance') {
        const newAmount = application.serviceCharge || 0
        await adjustCustomerAdvanceBalance(application.customerType, newIdentifier, newAmount, 'decrement', data.phone)
      }
    }

    // Auto-save individual with balance/credit to Individual Directory
    if (application.customerType === 'Individual' && (application.balance > 0 || application.customerPayment === 'Credit')) {
      const name = application.customerName.trim()
      try {
        const existing = await prisma.individual.findUnique({ where: { name } })
        if (!existing) {
          await prisma.individual.create({
            data: {
              name,
              phone: application.phone || ''
            }
          })
        }
      } catch (err) {
        console.error('Failed to auto-save individual to directory:', err)
      }
    }

    return { success: true, data: application }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('settle-card-transaction', async (_event, data) => {
  try {
    const { id, cardReceiptNet, receivingAccount, settlementNote } = data
    const application = await prisma.application.update({
      where: { id: parseInt(id, 10) },
      data: {
        cardReceiptNet: parseFloat(cardReceiptNet) || 0,
        receivingAccount: receivingAccount || null,
        settlementNote: settlementNote || ''
      }
    })
    return { success: true, data: application }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-application', async (_event, { id }) => {
  try {
    const oldApp = await prisma.application.findUnique({
      where: { id },
      include: { service: { include: { category: true } } }
    })

    await prisma.application.delete({
      where: { id }
    })

    if (oldApp) {
      const oldIsAdvanceDeposit = oldApp.service?.name === 'Advance Deposit' && oldApp.service?.category?.name === 'System'
      const oldIdentifier = oldApp.customerType === 'Company' ? oldApp.emiratesId : oldApp.customerName
      const oldAmount = oldApp.customerPayment === 'Advance' && !oldIsAdvanceDeposit
        ? (oldApp.serviceCharge || 0)
        : (oldIsAdvanceDeposit ? (oldApp.paidAmount || oldApp.serviceCharge || 0) : (oldApp.paidAmount !== null && oldApp.paidAmount !== undefined ? oldApp.paidAmount : oldApp.serviceCharge))

      if (oldIsAdvanceDeposit) {
        await adjustCustomerAdvanceBalance(oldApp.customerType, oldIdentifier, oldAmount, 'decrement', oldApp.phone)
      } else if (oldApp.customerPayment === 'Advance') {
        await adjustCustomerAdvanceBalance(oldApp.customerType, oldIdentifier, oldAmount, 'increment', oldApp.phone)
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════
//  GOVERNMENT ENTITY PAYMENTS (TRAVELS LEDGER)
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('get-entity-payments', async () => {
  try {
    const payments = await prisma.govtEntityPayment.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, data: payments }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('create-entity-payment', async (_event, data) => {
  try {
    const payment = await prisma.govtEntityPayment.create({
      data: {
        entityName: data.entityName,
        amount: parseFloat(data.amount) || 0,
        paymentMethod: data.paymentMethod || 'Cash',
        notes: data.notes || '',
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
      }
    })
    return { success: true, data: payment }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-entity-payment', async (_event, { id }) => {
  try {
    await prisma.govtEntityPayment.delete({
      where: { id: parseInt(id, 10) }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════
//  TRAVEL SUPPLIER PAYMENTS
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('get-travel-payments', async () => {
  try {
    const payments = await prisma.travelSupplierPayment.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, data: payments }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('create-travel-payment', async (_event, data) => {
  try {
    const payment = await prisma.travelSupplierPayment.create({
      data: {
        supplierName: data.supplierName,
        amount: parseFloat(data.amount) || 0,
        paymentMethod: data.paymentMethod || 'Cash',
        notes: data.notes || '',
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
      }
    })
    return { success: true, data: payment }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-travel-payment', async (_event, { id }) => {
  try {
    await prisma.travelSupplierPayment.delete({
      where: { id: parseInt(id, 10) }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════
//  DATABASE CONFIG
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('get-db-config', async () => {
  const configPath = join(app.getPath('userData'), 'db-config.json')
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      return { success: true, data }
    }
  } catch {}
  return { success: true, data: { databaseUrl: DEFAULT_DB_URL } }
})

ipcMain.handle('save-db-config', async (_event, { databaseUrl }) => {
  const configPath = join(app.getPath('userData'), 'db-config.json')
  try {
    fs.writeFileSync(configPath, JSON.stringify({ databaseUrl }, null, 2))
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('relaunch-app', () => {
  app.relaunch()
  app.exit(0)
})

ipcMain.handle('test-db-connection', async (_event, { databaseUrl }) => {
  try {
    const tempPrisma = new PrismaClient({
      datasources: {
        db: { url: databaseUrl }
      }
    })
    await tempPrisma.$queryRaw`SELECT 1`
    await tempPrisma.$disconnect()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

async function autoBackupDatabase() {
  const logPath = join(app.getPath('userData'), 'migration.log')
  const log = (msg) => {
    const formattedMsg = `[${new Date().toISOString()}] [AutoBackup] ${msg}`
    console.log(formattedMsg)
    try { fs.appendFileSync(logPath, formattedMsg + '\n', 'utf8') } catch (e) {}
  }

  try {
    // 1. Ensure database is reachable
    await prisma.$queryRaw`SELECT 1`
  } catch (err) {
    log(`Database unreachable, skipping auto-backup: ${err.message}`)
    return
  }

  try {
    const backupDir = join(app.getPath('userData'), 'backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const todayStr = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
    const backupPath = join(backupDir, `db_backup_${todayStr}.json`)

    if (fs.existsSync(backupPath)) {
      log(`Backup for today (${todayStr}) already exists. Skipping.`)
      return
    }

    log(`Starting daily auto-backup to: ${backupPath}`)

    // Fetch all 16 tables
    const shopConfig = await prisma.shopConfig.findMany()
    const category = await prisma.category.findMany()
    const service = await prisma.service.findMany()
    const paymentCard = await prisma.paymentCard.findMany()
    const company = await prisma.company.findMany()
    const companyRecord = await prisma.companyRecord.findMany()
    const individual = await prisma.individual.findMany()
    const individualRecord = await prisma.individualRecord.findMany()
    const application = await prisma.application.findMany()
    const user = await prisma.user.findMany()
    const expense = await prisma.expense.findMany()
    const govtEntity = await prisma.govtEntity.findMany()
    const govtEntityPayment = await prisma.govtEntityPayment.findMany()
    const travelSupplier = await prisma.travelSupplier.findMany()
    const travelSupplierPayment = await prisma.travelSupplierPayment.findMany()
    const accountTransfer = await prisma.accountTransfer.findMany()

    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      shopConfig,
      category,
      service,
      paymentCard,
      company,
      companyRecord,
      individual,
      individualRecord,
      application,
      user,
      expense,
      govtEntity,
      govtEntityPayment,
      travelSupplier,
      travelSupplierPayment,
      accountTransfer
    }

    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8')
    log(`Daily auto-backup completed successfully: ${backupPath}`)

    // Clean up backups older than 30 days
    const files = fs.readdirSync(backupDir)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    for (const file of files) {
      if (file.startsWith('db_backup_') && file.endsWith('.json')) {
        const fileDateStr = file.replace('db_backup_', '').replace('.json', '')
        const fileDate = new Date(fileDateStr)
        if (!isNaN(fileDate.getTime()) && fileDate < thirtyDaysAgo) {
          const oldFilePath = join(backupDir, file)
          fs.unlinkSync(oldFilePath)
          log(`Deleted old backup file: ${file}`)
        }
      }
    }
  } catch (error) {
    log(`Auto-backup failed: ${error.stack || error.message}`)
  }
}

ipcMain.handle('check-db-connection', async () => {
  try {
    // Race the DB query against a 5-second timeout so the renderer never hangs
    const result = await Promise.race([
      prisma.$queryRaw`SELECT 1`.then(async () => {
        // Run migrations on successful connection as a fail-safe
        await runPrismaMigrations()
        // Run daily database backup as a fail-safe
        await autoBackupDatabase()
        return { success: true }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out after 5 seconds')), 5000))
    ])
    return result
  } catch (error) {
    console.error('DB connection check failed:', error.message)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('backup-database', async () => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Backup Database',
      defaultPath: join(app.getPath('documents'), 'typing_center_backup.json'),
      filters: [{ name: 'JSON files', extensions: ['json'] }]
    })

    if (canceled) {
      return { success: true, cancelled: true }
    }

    // Fetch all 16 tables
    const shopConfig = await prisma.shopConfig.findMany()
    const category = await prisma.category.findMany()
    const service = await prisma.service.findMany()
    const paymentCard = await prisma.paymentCard.findMany()
    const company = await prisma.company.findMany()
    const companyRecord = await prisma.companyRecord.findMany()
    const individual = await prisma.individual.findMany()
    const individualRecord = await prisma.individualRecord.findMany()
    const application = await prisma.application.findMany()
    const user = await prisma.user.findMany()
    const expense = await prisma.expense.findMany()
    const govtEntity = await prisma.govtEntity.findMany()
    const govtEntityPayment = await prisma.govtEntityPayment.findMany()
    const travelSupplier = await prisma.travelSupplier.findMany()
    const travelSupplierPayment = await prisma.travelSupplierPayment.findMany()
    const accountTransfer = await prisma.accountTransfer.findMany()

    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      shopConfig,
      category,
      service,
      paymentCard,
      company,
      companyRecord,
      individual,
      individualRecord,
      application,
      user,
      expense,
      govtEntity,
      govtEntityPayment,
      travelSupplier,
      travelSupplierPayment,
      accountTransfer
    }

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8')
    return { success: true, filePath }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('restore-database', async () => {
  try {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Restore Database',
      filters: [{ name: 'JSON files', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (canceled || filePaths.length === 0) {
      return { success: true, cancelled: true }
    }

    const rawData = fs.readFileSync(filePaths[0], 'utf8')
    const data = JSON.parse(rawData)

    // Validate structure a bit
    if (!data.version || !data.user) {
      throw new Error('Invalid backup file structure.')
    }

    // Delete in sequence to satisfy foreign key constraints
    await prisma.$transaction(async (tx) => {
      // 1. Delete dependent tables
      await tx.application.deleteMany({})
      await tx.individualRecord.deleteMany({})
      await tx.companyRecord.deleteMany({})

      // 2. Delete primary tables
      await tx.travelSupplierPayment.deleteMany({})
      await tx.travelSupplier.deleteMany({})
      await tx.service.deleteMany({})
      await tx.accountTransfer.deleteMany({})
      await tx.govtEntityPayment.deleteMany({})
      await tx.expense.deleteMany({})
      await tx.individual.deleteMany({})
      await tx.company.deleteMany({})
      await tx.paymentCard.deleteMany({})
      await tx.category.deleteMany({})
      await tx.govtEntity.deleteMany({})
      await tx.shopConfig.deleteMany({})
      await tx.user.deleteMany({})

      // 3. Restore in sequence
      if (data.shopConfig && data.shopConfig.length > 0) {
        await tx.shopConfig.createMany({ data: data.shopConfig })
      }
      if (data.govtEntity && data.govtEntity.length > 0) {
        await tx.govtEntity.createMany({ data: data.govtEntity })
      }
      if (data.category && data.category.length > 0) {
        await tx.category.createMany({ data: data.category })
      }
      if (data.paymentCard && data.paymentCard.length > 0) {
        await tx.paymentCard.createMany({ data: data.paymentCard })
      }
      if (data.company && data.company.length > 0) {
        await tx.company.createMany({ data: data.company })
      }
      if (data.individual && data.individual.length > 0) {
        await tx.individual.createMany({ data: data.individual })
      }
      if (data.user && data.user.length > 0) {
        await tx.user.createMany({ data: data.user })
      }
      if (data.travelSupplier && data.travelSupplier.length > 0) {
        await tx.travelSupplier.createMany({ data: data.travelSupplier })
      }
      if (data.expense && data.expense.length > 0) {
        const expenses = data.expense.map(e => ({
          ...e,
          createdAt: e.createdAt ? new Date(e.createdAt) : new Date()
        }))
        await tx.expense.createMany({ data: expenses })
      }
      if (data.govtEntityPayment && data.govtEntityPayment.length > 0) {
        const payments = data.govtEntityPayment.map(p => ({
          ...p,
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date()
        }))
        await tx.govtEntityPayment.createMany({ data: payments })
      }
      if (data.travelSupplierPayment && data.travelSupplierPayment.length > 0) {
        const payments = data.travelSupplierPayment.map(p => ({
          ...p,
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date()
        }))
        await tx.travelSupplierPayment.createMany({ data: payments })
      }
      if (data.accountTransfer && data.accountTransfer.length > 0) {
        const transfers = data.accountTransfer.map(t => ({
          ...t,
          createdAt: t.createdAt ? new Date(t.createdAt) : new Date()
        }))
        await tx.accountTransfer.createMany({ data: transfers })
      }
      if (data.service && data.service.length > 0) {
        await tx.service.createMany({ data: data.service })
      }
      if (data.companyRecord && data.companyRecord.length > 0) {
        const records = data.companyRecord.map(r => ({
          ...r,
          issueDate: r.issueDate ? new Date(r.issueDate) : null,
          expiryDate: r.expiryDate ? new Date(r.expiryDate) : null,
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date()
        }))
        await tx.companyRecord.createMany({ data: records })
      }
      if (data.individualRecord && data.individualRecord.length > 0) {
        const records = data.individualRecord.map(r => ({
          ...r,
          issueDate: r.issueDate ? new Date(r.issueDate) : null,
          expiryDate: r.expiryDate ? new Date(r.expiryDate) : null,
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date()
        }))
        await tx.individualRecord.createMany({ data: records })
      }
      if (data.application && data.application.length > 0) {
        const apps = data.application.map(a => ({
          ...a,
          createdAt: a.createdAt ? new Date(a.createdAt) : new Date()
        }))
        await tx.application.createMany({ data: apps })
      }
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════
//  EXPENSES & MONTHLY REPORTS
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('get-expenses', async () => {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, data: expenses }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('create-expense', async (_event, data) => {
  try {
    const expense = await prisma.expense.create({
      data: {
        description: data.description,
        amount: parseFloat(data.amount) || 0,
        paymentMethod: data.paymentMethod || 'Cash',
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
      }
    })
    return { success: true, data: expense }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-expense', async (_event, data) => {
  try {
    const expense = await prisma.expense.update({
      where: { id: data.id },
      data: {
        description: data.description,
        amount: parseFloat(data.amount) || 0,
        paymentMethod: data.paymentMethod || 'Cash',
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined
      }
    })
    return { success: true, data: expense }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-expense', async (_event, { id }) => {
  try {
    await prisma.expense.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-monthly-report', async (_event, { year, month }) => {
  try {
    const y = parseInt(year, 10)
    const m = parseInt(month, 10)

    const startOfMonth = new Date(y, m - 1, 1, 0, 0, 0, 0)
    const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999)

    // Fetch applications in this month
    const applications = await prisma.application.findMany({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth }
      },
      include: { service: { include: { category: true } } },
      orderBy: { createdAt: 'desc' }
    })

    // Fetch expenses in this month
    const expenses = await prisma.expense.findMany({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, data: { applications, expenses } }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-expiring-documents', async () => {
  try {
    const today = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(today.getDate() + 30)

    // Reset hours for fair date comparison
    today.setHours(0, 0, 0, 0)
    
    // Fetch CompanyRecords with parent Company name
    const companyRecords = await prisma.companyRecord.findMany({
      where: {
        expiryDate: {
          lte: thirtyDaysFromNow
        }
      },
      include: {
        company: true
      }
    })

    // Fetch IndividualRecords with parent Individual name
    const individualRecords = await prisma.individualRecord.findMany({
      where: {
        expiryDate: {
          lte: thirtyDaysFromNow
        }
      },
      include: {
        individual: true
      }
    })

    // Map company records
    const companyMapped = companyRecords.map(r => ({
      id: `company-${r.id}`,
      dbId: r.id,
      clientName: r.employeeName || 'Trade License',
      parentName: r.company.name,
      parentId: r.companyId,
      type: 'Company',
      category: r.category,
      documentNumber: r.documentNumber,
      expiryDate: r.expiryDate,
      status: r.status,
      notes: r.notes
    }))

    // Map individual records
    const individualMapped = individualRecords.map(r => ({
      id: `individual-${r.id}`,
      dbId: r.id,
      clientName: r.holderName || 'Main Holder',
      parentName: r.individual.name,
      parentId: r.individualId,
      type: 'Individual',
      category: r.category,
      documentNumber: r.documentNumber,
      expiryDate: r.expiryDate,
      status: r.status,
      notes: r.notes
    }))

    // Combine and sort by expiryDate ascending
    const combined = [...companyMapped, ...individualMapped].sort((a, b) => {
      if (!a.expiryDate) return 1
      if (!b.expiryDate) return -1
      return new Date(a.expiryDate) - new Date(b.expiryDate)
    })

    return { success: true, data: combined }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('save-file-dialog', async (_event, { content, defaultName, filters }) => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Save File',
      defaultPath: join(app.getPath('documents'), defaultName),
      filters: filters
    })
    if (canceled || !filePath) return { success: true, cancelled: true }
    
    const buffer = Buffer.from(content, 'base64')
    fs.writeFileSync(filePath, buffer)
    return { success: true, filePath }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('print-to-pdf', async (_event, { html, defaultName }) => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export to PDF',
      defaultPath: join(app.getPath('documents'), defaultName),
      filters: [{ name: 'PDF Files (*.pdf)', extensions: ['pdf'] }]
    })
    if (canceled || !filePath) return { success: true, cancelled: true }

    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

    const data = await printWindow.webContents.printToPDF({
      printBackground: true,
      margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
    })

    fs.writeFileSync(filePath, data)
    printWindow.destroy()
    return { success: true, filePath }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════
//  WINDOW CREATION
// ═══════════════════════════════════════════════════════════════

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../src/logo.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Log renderer console messages and errors to a debug log file
  const debugLogPath = join(app.getPath('userData'), 'renderer-debug.log')
  const logToFile = (msg) => {
    try { fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] ${msg}\n`) } catch(e) {}
  }
  logToFile('=== App started, renderer loading ===')

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levels = ['LOG', 'WARN', 'ERROR']
    const logMsg = `[Renderer ${levels[level] || level}] ${message} (${sourceId}:${line})`
    console.log(logMsg)
    logToFile(logMsg)
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    const msg = `Renderer process gone: ${details.reason} (exit code: ${details.exitCode})`
    console.error(msg)
    logToFile(msg)
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    logToFile(`did-fail-load: ${errorCode} ${errorDescription}`)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    logToFile('did-finish-load: renderer page loaded successfully')
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ═══════════════════════════════════════════════════════════════
//  APP LIFECYCLE
// ═══════════════════════════════════════════════════════════════

async function seedDefaultAdmin() {
  try {
    const userCount = await prisma.user.count()
    if (userCount === 0) {
      await prisma.user.create({
        data: {
          username: 'admin',
          password: hashPassword('admin'),
          fullName: 'Administrator',
          role: 'Admin',
          isActive: true
        }
      })
      console.log('Seeded default admin user')
    }
  } catch (err) {
    console.error('Failed to seed admin user:', err)
  }
}

async function ensureAdvanceDepositService() {
  try {
    let systemCategory = await prisma.category.findUnique({
      where: { name: 'System' }
    })
    if (!systemCategory) {
      systemCategory = await prisma.category.create({
        data: { name: 'System' }
      })
      console.log('Created System category')
    }

    let advanceService = await prisma.service.findFirst({
      where: {
        name: 'Advance Deposit',
        categoryId: systemCategory.id
      }
    })
    if (!advanceService) {
      advanceService = await prisma.service.create({
        data: {
          name: 'Advance Deposit',
          price: 0,
          categoryId: systemCategory.id
        }
      })
      console.log('Created Advance Deposit service')
    }
  } catch (err) {
    console.error('Failed to ensure Advance Deposit service:', err)
  }
}

async function migrateCompanyRecordCategories() {
  try {
    // 1. Migrate exactly 'Trade License' to 'Company/Trade License'
    const res1 = await prisma.companyRecord.updateMany({
      where: { category: 'Trade License' },
      data: { category: 'Company/Trade License' }
    })
    if (res1.count > 0) {
      console.log(`Migrated ${res1.count} Trade License categories to Company/Trade License`)
    }

    // 2. Migrate categories starting with 'Employee Category/' to 'Employees/'
    const employeeCategoryRecords = await prisma.companyRecord.findMany({
      where: {
        category: {
          startsWith: 'Employee Category/'
        }
      }
    })

    for (const record of employeeCategoryRecords) {
      const newCategory = record.category.replace('Employee Category/', 'Employees/')
      await prisma.companyRecord.update({
        where: { id: record.id },
        data: { category: newCategory }
      })
    }
    if (employeeCategoryRecords.length > 0) {
      console.log(`Migrated ${employeeCategoryRecords.length} Employee Category records to Employees`)
    }
  } catch (err) {
    console.error('Failed to migrate company record categories:', err)
  }
}

async function seedDefaultGovtEntities() {
  try {
    const entityCount = await prisma.govtEntity.count()
    if (entityCount === 0) {
      const defaults = [
        "MOHRE",
        "ICP",
        "Immigration",
        "DHA",
        "Tasheel",
        "Amer",
        "Energy Travels",
        "Akbar Travels",
        "Attestation",
        "Other",
        "N/A"
      ]
      await prisma.govtEntity.createMany({
        data: defaults.map(name => ({ name }))
      })
      console.log('Seeded default government entities')
    }
  } catch (err) {
    console.error('Failed to seed government entities:', err)
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.typingcenter')
  app.on('browser-window-created', (_, window) => { optimizer.watchWindowShortcuts(window) })
  await runPrismaMigrations()
  await autoBackupDatabase()
  await seedDefaultAdmin()
  await ensureAdvanceDepositService()
  await seedDefaultGovtEntities()
  await migrateCompanyRecordCategories()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', async () => { await prisma.$disconnect() })
