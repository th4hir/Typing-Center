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

  // Payment Cards
  fetchPaymentCards: () => ipcRenderer.invoke('get-payment-cards'),
  createPaymentCard: (data) => ipcRenderer.invoke('create-payment-card', data),
  togglePaymentCard: (data) => ipcRenderer.invoke('toggle-payment-card', data),

  // Companies
  fetchCompanies: () => ipcRenderer.invoke('get-companies'),
  createCompany: (data) => ipcRenderer.invoke('create-company', data),

  // Applications
  fetchApplications: () => ipcRenderer.invoke('get-applications'),
  createApplication: (data) => ipcRenderer.invoke('create-application', data),

  // Reports
  getDailyReport: (data) => ipcRenderer.invoke('get-daily-report', data),
  getCardAccounts: (data) => ipcRenderer.invoke('get-card-accounts', data)
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
