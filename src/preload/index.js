import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Shop Config
  getShopConfig: () => ipcRenderer.invoke('get-shop-config'),
  saveShopConfig: (data) => ipcRenderer.invoke('save-shop-config', data),

  // Categories
  fetchCategories: () => ipcRenderer.invoke('get-categories'),
  createCategory: (data) => ipcRenderer.invoke('create-category', data),

  // Services
  fetchServices: () => ipcRenderer.invoke('get-services'),
  createService: (data) => ipcRenderer.invoke('create-service', data),
  getAdvanceDepositService: () => ipcRenderer.invoke('get-advance-deposit-service'),

  // Payment Cards
  fetchPaymentCards: () => ipcRenderer.invoke('get-payment-cards'),
  createPaymentCard: (data) => ipcRenderer.invoke('create-payment-card', data),
  togglePaymentCard: (data) => ipcRenderer.invoke('toggle-payment-card', data),

  // Companies
  fetchCompanies: () => ipcRenderer.invoke('get-companies'),
  createCompany: (data) => ipcRenderer.invoke('create-company', data),
  updateCompany: (data) => ipcRenderer.invoke('update-company', data),
  deleteCompany: (data) => ipcRenderer.invoke('delete-company', data),
  adjustCompanyAdvance: (data) => ipcRenderer.invoke('adjust-company-advance', data),
  fetchCompanyRecords: (data) => ipcRenderer.invoke('get-company-records', data),
  createCompanyRecord: (data) => ipcRenderer.invoke('create-company-record', data),
  updateCompanyRecord: (data) => ipcRenderer.invoke('update-company-record', data),
  deleteCompanyRecord: (data) => ipcRenderer.invoke('delete-company-record', data),

  // Individuals
  fetchIndividuals: () => ipcRenderer.invoke('get-individuals'),
  createIndividual: (data) => ipcRenderer.invoke('create-individual', data),
  updateIndividual: (data) => ipcRenderer.invoke('update-individual', data),
  deleteIndividual: (data) => ipcRenderer.invoke('delete-individual', data),
  adjustIndividualAdvance: (data) => ipcRenderer.invoke('adjust-individual-advance', data),
  fetchIndividualRecords: (data) => ipcRenderer.invoke('get-individual-records', data),
  createIndividualRecord: (data) => ipcRenderer.invoke('create-individual-record', data),
  updateIndividualRecord: (data) => ipcRenderer.invoke('update-individual-record', data),
  deleteIndividualRecord: (data) => ipcRenderer.invoke('delete-individual-record', data),

  // Applications
  fetchApplications: () => ipcRenderer.invoke('get-applications'),
  createApplication: (data) => ipcRenderer.invoke('create-application', data),

  // Reports
  getDailyReport: (data) => ipcRenderer.invoke('get-daily-report', data),
  getCardAccounts: (data) => ipcRenderer.invoke('get-card-accounts', data),

  // Users & Auth
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  fetchUsers: () => ipcRenderer.invoke('get-users'),
  createUser: (data) => ipcRenderer.invoke('create-user', data),
  updateUser: (data) => ipcRenderer.invoke('update-user', data),
  toggleUserStatus: (data) => ipcRenderer.invoke('toggle-user-status', data),

  // Services & Cards Edit/Delete
  updateService: (data) => ipcRenderer.invoke('update-service', data),
  deleteService: (data) => ipcRenderer.invoke('delete-service', data),
  updatePaymentCard: (data) => ipcRenderer.invoke('update-payment-card', data),
  deletePaymentCard: (data) => ipcRenderer.invoke('delete-payment-card', data),

  // Applications Edit/Delete
  updateApplication: (data) => ipcRenderer.invoke('update-application', data),
  deleteApplication: (data) => ipcRenderer.invoke('delete-application', data),

  // Database Configuration
  getDbConfig: () => ipcRenderer.invoke('get-db-config'),
  saveDbConfig: (data) => ipcRenderer.invoke('save-db-config', data),
  testDbConnection: (data) => ipcRenderer.invoke('test-db-connection', data),
  checkDbConnection: () => ipcRenderer.invoke('check-db-connection'),
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  restoreDatabase: () => ipcRenderer.invoke('restore-database'),
  fetchExpenses: () => ipcRenderer.invoke('get-expenses'),
  createExpense: (data) => ipcRenderer.invoke('create-expense', data),
  updateExpense: (data) => ipcRenderer.invoke('update-expense', data),
  deleteExpense: (data) => ipcRenderer.invoke('delete-expense', data),
  getMonthlyReport: (data) => ipcRenderer.invoke('get-monthly-report', data),
  fetchExpiringDocuments: () => ipcRenderer.invoke('get-expiring-documents')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
