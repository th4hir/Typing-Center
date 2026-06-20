import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
        status: data.status || 'Pending'
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
    const startOfDay = new Date(dateStr + 'T00:00:00.000Z')
    const endOfDay = new Date(dateStr + 'T23:59:59.999Z')

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
      where.createdAt = {
        gte: new Date(data.startDate + 'T00:00:00.000Z'),
        lte: new Date(data.endDate + 'T23:59:59.999Z')
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
//  WINDOW CREATION
// ═══════════════════════════════════════════════════════════════

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
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

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.typingcenter')
  app.on('browser-window-created', (_, window) => { optimizer.watchWindowShortcuts(window) })
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', async () => { await prisma.$disconnect() })
