import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import fs from 'fs'

const DEFAULT_DB_URL = "postgresql://postgres:admin@localhost:5432/typing_center_db"

function getDatabaseUrl() {
  const configPath = join(app.getPath('userData'), 'db-config.json')
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      if (data && data.databaseUrl) {
        return data.databaseUrl
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
    const category = await prisma.category.create({ data: { name: data.name } })
    return { success: true, data: category }
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
      data: { bankName: data.bankName, isActive: true }
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

ipcMain.handle('create-application', async (_event, data) => {
  try {
    const application = await prisma.application.create({
      data: {
        customerName: data.customerName,
        phone: data.phone || '',
        emiratesId: data.emiratesId || '',
        customerType: data.customerType || 'Individual',
        serviceId: data.serviceId,
        serviceCharge: data.serviceCharge || 0,
        customerPayment: data.customerPayment || 'Cash',
        govtFee: data.govtFee || 0,
        govtPayment: data.govtPayment || 'Cash',
        typingFee: data.typingFee || 0,
        status: data.status || 'Pending',
        createdBy: data.createdBy || ''
      },
      include: { service: { include: { category: true } } }
    })
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
      data: { bankName: data.bankName }
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
        govtFee: data.govtFee || 0,
        govtPayment: data.govtPayment || 'Cash',
        typingFee: data.typingFee || 0,
        status: data.status || 'Pending'
      },
      include: { service: { include: { category: true } } }
    })
    return { success: true, data: application }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-application', async (_event, { id }) => {
  try {
    await prisma.application.delete({
      where: { id }
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

ipcMain.handle('check-db-connection', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { success: true }
  } catch (error) {
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

    const shopConfig = await prisma.shopConfig.findMany()
    const category = await prisma.category.findMany()
    const service = await prisma.service.findMany()
    const paymentCard = await prisma.paymentCard.findMany()
    const company = await prisma.company.findMany()
    const companyRecord = await prisma.companyRecord.findMany()
    const application = await prisma.application.findMany()
    const user = await prisma.user.findMany()

    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      shopConfig,
      category,
      service,
      paymentCard,
      company,
      companyRecord,
      application,
      user
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
      await tx.companyRecord.deleteMany({})
      // 2. Delete primary tables
      await tx.service.deleteMany({})
      await tx.company.deleteMany({})
      await tx.category.deleteMany({})
      await tx.paymentCard.deleteMany({})
      await tx.shopConfig.deleteMany({})
      await tx.user.deleteMany({})

      // 3. Restore in sequence
      if (data.shopConfig && data.shopConfig.length > 0) {
        await tx.shopConfig.createMany({ data: data.shopConfig })
      }
      if (data.category && data.category.length > 0) {
        await tx.category.createMany({ data: data.category })
      }
      if (data.service && data.service.length > 0) {
        await tx.service.createMany({ data: data.service })
      }
      if (data.company && data.company.length > 0) {
        await tx.company.createMany({ data: data.company })
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
      if (data.application && data.application.length > 0) {
        const apps = data.application.map(a => ({
          ...a,
          createdAt: a.createdAt ? new Date(a.createdAt) : new Date()
        }))
        await tx.application.createMany({ data: apps })
      }
      if (data.paymentCard && data.paymentCard.length > 0) {
        await tx.paymentCard.createMany({ data: data.paymentCard })
      }
      if (data.user && data.user.length > 0) {
        await tx.user.createMany({ data: data.user })
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

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.typingcenter')
  app.on('browser-window-created', (_, window) => { optimizer.watchWindowShortcuts(window) })
  await seedDefaultAdmin()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', async () => { await prisma.$disconnect() })
