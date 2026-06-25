import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { AllCommunityModule, themeAlpine } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { Modal, Button, Form, Spinner, Alert, Dropdown, Card } from 'react-bootstrap'
import HomeDashboard from './HomeDashboard'
import AdminSettings from './AdminSettings'
import DailyReport from './DailyReport'
import Accounts from './Accounts'
import LoginScreen from './LoginScreen'
import CompanyManagement from './CompanyManagement'
import IndividualManagement from './IndividualManagement'
import ExpensesManagement from './ExpensesManagement'
import MonthlyReport from './MonthlyReport'
import TravelsLedger from './TravelsLedger'
import { exportToExcel, exportToPDF } from './exportHelper'
import logo from '../../logo-nobg.png'
import fcLogo from '../../logo-nobg.png'
import wallpaper from '../../Wallpaper.png'
import screenBg from '../../screen.png'
import {
  HomeIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  RefreshIcon,
  ExportIcon,
  CompanyIcon,
  IndividualIcon,
  ApplicationIcon,
  ReportIcon,
  CardIcon,
  SettingsIcon,
  SaveIcon,
  SalesIcon,
  PendingIcon,
  LogoutIcon,
  CloseIcon,
  SunIcon,
  MoonIcon,
  BellIcon,
  BillIcon,
  PlaneIcon,
  UserIcon,
  KeyIcon,
  WarningIcon,
  SearchIcon
} from './Icons'

const DatabaseIcon = ({ size = 16, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path d="M3 12A9 3 0 0 0 21 12" />
  </svg>
)

const ServerIcon = ({ size = 16, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
    <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
)

const PortIcon = ({ size = 16, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

// ─── Custom AG Grid Themes (TAMM Style) ──────────────────────────────
const lightGridTheme = themeAlpine.withParams({
  backgroundColor: '#ffffff',
  headerBackgroundColor: '#f8fafc',
  oddRowBackgroundColor: 'rgba(248, 250, 252, 0.6)',
  rowHoverColor: '#f1f5f9',
  borderColor: '#e2e8f0',
  headerTextColor: '#4b5563',
  textColor: '#1f2937',
  secondaryTextColor: '#4b5563',
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  rowHeight: 48,
  headerHeight: 44,
  cellHorizontalPadding: 16,
  rangeSelectionBorderColor: '#005691',
  selectedRowBackgroundColor: 'rgba(0, 86, 145, 0.08)',
})

const darkGridTheme = themeAlpine.withParams({
  backgroundColor: '#161a23',
  headerBackgroundColor: '#12141a',
  oddRowBackgroundColor: 'rgba(248, 250, 252, 0.03)',
  rowHoverColor: '#1e2230',
  borderColor: '#1e2230',
  headerTextColor: '#94a3b8',
  textColor: '#e2e8f0',
  secondaryTextColor: '#94a3b8',
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  rowHeight: 48,
  headerHeight: 44,
  cellHorizontalPadding: 16,
  rangeSelectionBorderColor: '#007cc3',
  selectedRowBackgroundColor: 'rgba(0, 124, 195, 0.12)',
})

// ─── Cell Renderers ──────────────────────────────────────────
function StatusRenderer(params) {
  const statusClass = params.value?.toLowerCase().replace(/\s+/g, '-') || ''
  return <span className={`status-badge ${statusClass}`}>{params.value}</span>
}
function DateRenderer(params) {
  if (!params.value) return '—'
  const d = new Date(params.value)
  return d.toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' })
}
function CustomerTypeRenderer(params) {
  const cls = params.value === 'Company' ? 'company' : 'individual'
  return <span className={`customer-type-badge ${cls}`}>{params.value}</span>
}
function ActionsRenderer(params) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', height: '100%' }}>
      <button
        className="btn-outline-subtle d-flex align-items-center gap-1"
        style={{ padding: '2px 8px', fontSize: '0.75rem', height: 26, lineHeight: '22px' }}
        onClick={(e) => { e.stopPropagation(); params.onEdit(params.data); }}
      >
        <EditIcon size={12} /> Edit
      </button>
      <button
        className="btn-outline-subtle text-danger d-flex align-items-center gap-1"
        style={{ padding: '2px 8px', fontSize: '0.75rem', height: 26, lineHeight: '22px', borderColor: 'rgba(239, 68, 68, 0.2)' }}
        onClick={(e) => { e.stopPropagation(); params.onDelete(params.data); }}
      >
        <TrashIcon size={12} /> Delete
      </button>
    </div>
  )
}

// ─── Empty form state ────────────────────────────────────────
const emptyForm = {
  customerName: '',
  phone: '',
  emiratesId: '',
  companyId: '',
  serviceId: '',
  serviceCharge: '', // Customer Fee (total)
  typingFee: '',     // Typing Fee (profit)
  paidAmount: '',    // Paid Amount by customer
  customerPayment: 'Cash',
  govtFee: '',
  govtPayment: 'Cash',
  status: 'Pending',
  govtEntity: '',
  govtPaid: ''
}

function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const fmt = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  return { startDate: fmt(start), endDate: fmt(end) }
}

const formatDate = (dateVal) => {
  if (!dateVal) return '—'
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return String(dateVal)
  return d.toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── App Component ───────────────────────────────────────────
function App() {
  const gridRef = useRef(null)
  const [quickFilter, setQuickFilter] = useState('')
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [gridFilter, setGridFilter] = useState('all') // 'all' | 'credit' | 'pending-govt'
  const [appCompanyId, setAppCompanyId] = useState(null)
  const [appIndividualId, setAppIndividualId] = useState(null)
  const [saveToDirectory, setSaveToDirectory] = useState(false)
  const [appStartDate, setAppStartDate] = useState(() => getMonthRange().startDate)
  const [appEndDate, setAppEndDate] = useState(() => getMonthRange().endDate)

  // ── Theme Management ──
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light'
  })

  useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-dark')
    document.body.classList.add(`theme-${theme}`)
    localStorage.setItem('theme', theme)
  }, [theme])

  // ── User Session ──
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('currentUser')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const handleLoginSuccess = useCallback((user) => {
    setCurrentUser(user)
    localStorage.setItem('currentUser', JSON.stringify(user))
  }, [])

  const handleLogout = useCallback(() => {
    setCurrentUser(null)
    localStorage.removeItem('currentUser')
    setCurrentPage('applications')
  }, [])

  // ── Shop config ──
  const [shopConfig, setShopConfig] = useState(null)
  const [showSetup, setShowSetup] = useState(false)
  const [setupName, setSetupName] = useState('')
  const [setupAddress, setSetupAddress] = useState('')
  const [setupPhone, setSetupPhone] = useState('')
  const [setupSaving, setSetupSaving] = useState(false)
  const [editingApplicationId, setEditingApplicationId] = useState(null)

  // ── Live data ──
  const [applications, setApplications] = useState([])
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [individuals, setIndividuals] = useState([])
  const [paymentCards, setPaymentCards] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ── Category & Service filters/inline add ──
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [showAddService, setShowAddService] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [newServiceCategoryId, setNewServiceCategoryId] = useState('')
  const [addingService, setAddingService] = useState(false)

  const filteredApplications = useMemo(() => {
    let result = applications

    if (appStartDate && appEndDate) {
      const start = new Date(appStartDate)
      const end = new Date(appEndDate)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)

      result = result.filter(a => {
        const d = new Date(a.createdAt)
        return d >= start && d <= end
      })
    }

    if (gridFilter === 'credit') {
      return result.filter(a => a.balance > 0 && a.status !== 'Rejected')
    }
    if (gridFilter === 'credit-company') {
      return result.filter(a => a.balance > 0 && a.status !== 'Rejected' && a.customerType === 'Company')
    }
    if (gridFilter === 'credit-individual') {
      return result.filter(a => a.balance > 0 && a.status !== 'Rejected' && a.customerType === 'Individual')
    }
    if (gridFilter === 'pending-govt') {
      return result.filter(a => (a.status === 'Pending' || a.status === 'In Progress') && a.govtPayment !== 'N/A')
    }
    return result
  }, [applications, gridFilter, appStartDate, appEndDate])

  // ── Govt Entity state & inline add ──
  const [govtEntities, setGovtEntities] = useState([])
  const [showAddGovtEntity, setShowAddGovtEntity] = useState(false)
  const [newGovtEntityName, setNewGovtEntityName] = useState('')
  const [addingGovtEntity, setAddingGovtEntity] = useState(false)

  // ── Travel Supplier state & inline add ──
  const [travelSuppliers, setTravelSuppliers] = useState([])
  const [showAddTravelSupplier, setShowAddTravelSupplier] = useState(false)
  const [newTravelSupplierName, setNewTravelSupplierName] = useState('')
  const [addingTravelSupplier, setAddingTravelSupplier] = useState(false)

  const companiesRef = useRef(companies)
  useEffect(() => {
    companiesRef.current = companies
  }, [companies])

  const servicesRef = useRef(services)
  useEffect(() => {
    servicesRef.current = services
  }, [services])

  const paymentCardsRef = useRef(paymentCards)
  useEffect(() => {
    paymentCardsRef.current = paymentCards
  }, [paymentCards])

  // ── Column Visibility states ──
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const stored = localStorage.getItem('grid_visible_cols')
      return stored ? JSON.parse(stored) : {
        id: true,
        customerName: true,
        customerType: true,
        emiratesId: true,
        service: true,
        serviceCharge: true,
        govtFee: true,
        typingFee: true,
        paidAmount: true,
        balance: true,
        customerPayment: true,
        createdBy: true,
        createdAt: true,
        status: true,
        govtEntity: true,
        actions: true
      }
    } catch {
      return {
        id: true,
        customerName: true,
        customerType: true,
        emiratesId: true,
        service: true,
        serviceCharge: true,
        govtFee: true,
        typingFee: true,
        paidAmount: true,
        balance: true,
        customerPayment: true,
        createdBy: true,
        createdAt: true,
        status: true,
        govtEntity: true,
        actions: true
      }
    }
  })

  const getFriendlyColName = useCallback((col) => {
    switch (col) {
      case 'id': return 'ID'
      case 'customerName': return 'Customer Name'
      case 'customerType': return 'Customer Type'
      case 'emiratesId': return 'Company / EID'
      case 'service': return 'Service'
      case 'serviceCharge': return 'Customer Fee'
      case 'govtFee': return 'Govt Fee'
      case 'typingFee': return 'Typing Fee'
      case 'paidAmount': return 'Paid Amount'
      case 'balance': return 'Balance'
      case 'customerPayment': return 'Paid By'
      case 'createdBy': return 'Staff'
      case 'createdAt': return 'Date'
      case 'status': return 'Status'
      case 'govtEntity': return 'Govt Entity'
      case 'actions': return 'Actions'
      default: return col
    }
  }, [])

  const handleToggleColumn = useCallback((col) => {
    setVisibleCols(prev => {
      const updated = { ...prev, [col]: !prev[col] }
      localStorage.setItem('grid_visible_cols', JSON.stringify(updated))
      if (gridRef.current && gridRef.current.api) {
        gridRef.current.api.setColumnsVisible([col], updated[col]);
        // Immediately save the updated column state (which includes visibility)
        const columnState = gridRef.current.api.getColumnState();
        localStorage.setItem('grid_column_state', JSON.stringify(columnState));
      }
      return updated
    })
  }, [])

  const saveColumnState = useCallback(() => {
    if (gridRef.current && gridRef.current.api) {
      const columnState = gridRef.current.api.getColumnState();
      localStorage.setItem('grid_column_state', JSON.stringify(columnState));
    }
  }, []);

  const onGridReady = useCallback((params) => {
    const savedState = localStorage.getItem('grid_column_state');
    if (savedState) {
      try {
        params.api.applyColumnState({
          state: JSON.parse(savedState),
          applyOrder: true,
        });
      } catch (err) {
        console.error('Failed to restore column state:', err);
      }
    } else {
      // Hide columns that are unchecked in initial visibleCols state
      const colsToHide = Object.keys(visibleCols).filter(col => !visibleCols[col]);
      if (colsToHide.length > 0) {
        params.api.setColumnsVisible(colsToHide, false);
      }
    }
  }, [visibleCols]);

  // ── Database Connection states ──
  const [showDbConnectionSetup, setShowDbConnectionSetup] = useState(false)
  const [checkingDb, setCheckingDb] = useState(true)
  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: '5432',
    user: 'postgres',
    password: 'admin',
    name: 'typing_center_db'
  })
  const [dbSetupSaving, setDbSetupSaving] = useState(false)
  const [dbSetupError, setDbSetupError] = useState(null)

  const parseDatabaseUrl = (url) => {
    try {
      const matches = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
      if (matches) {
        return {
          user: matches[1],
          password: matches[2],
          host: matches[3],
          port: matches[4],
          name: matches[5]
        }
      }
    } catch { }
    return { user: 'postgres', password: 'admin', host: 'localhost', port: '5432', name: 'typing_center_db' }
  }

  const buildDatabaseUrl = (user, password, host, port, name) => {
    return `postgresql://${user}:${password}@${host}:${port}/${name}`
  }

  // ── Loaders ──
  const loadShopConfig = useCallback(async () => {
    try {
      const result = await window.api.getShopConfig()
      if (result.success && result.data) setShopConfig(result.data)
      else setShowSetup(true)
    } catch { setShowSetup(true) }
  }, [])

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const result = await window.api.fetchApplications()
      if (result.success) setApplications(result.data)
      else setError(result.error)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [])

  const loadServices = useCallback(async () => {
    try {
      const result = await window.api.fetchServices()
      if (result.success) setServices(result.data)
    } catch (err) { console.error(err) }
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      const result = await window.api.fetchCategories()
      if (result.success) setCategories(result.data)
    } catch (err) { console.error(err) }
  }, [])

  const loadIndividuals = useCallback(async () => {
    try {
      const result = await window.api.fetchIndividuals()
      if (result.success) setIndividuals(result.data)
    } catch (err) { console.error(err) }
  }, [])

  const loadPaymentCards = useCallback(async () => {
    try {
      const result = await window.api.fetchPaymentCards()
      if (result.success) setPaymentCards(result.data.filter(c => c.isActive))
    } catch (err) { console.error(err) }
  }, [])

  const loadCompanies = useCallback(async () => {
    try {
      const result = await window.api.fetchCompanies()
      if (result.success) setCompanies(result.data)
    } catch (err) { console.error(err) }
  }, [])

  const loadGovtEntities = useCallback(async () => {
    try {
      const result = await window.api.fetchGovtEntities()
      if (result.success) setGovtEntities(result.data)
    } catch (err) { console.error(err) }
  }, [])

  const loadTravelSuppliers = useCallback(async () => {
    try {
      const result = await window.api.fetchTravelSuppliers()
      if (result.success) setTravelSuppliers(result.data)
    } catch (err) { console.error(err) }
  }, [])

  const verifyDatabaseConnection = useCallback(async () => {
    try {
      setCheckingDb(true)
      // Add a 1.5s delay to show the connecting splash screen
      await new Promise(resolve => setTimeout(resolve, 1500))
      const res = await window.api.checkDbConnection()
      if (res.success) {
        setShowDbConnectionSetup(false)
        loadShopConfig()
        loadApplications()
        loadCategories()
        loadIndividuals()
        loadServices()
        loadPaymentCards()
        loadCompanies()
        loadGovtEntities()
        loadTravelSuppliers()
      } else {
        setShowDbConnectionSetup(true)
        const cfgRes = await window.api.getDbConfig()
        if (cfgRes.success && cfgRes.data && cfgRes.data.databaseUrl) {
          const parsed = parseDatabaseUrl(cfgRes.data.databaseUrl)
          setDbConfig({
            host: parsed.host,
            port: parsed.port,
            user: parsed.user,
            password: parsed.password,
            name: parsed.name
          })
        }
      }
    } catch (err) {
      setShowDbConnectionSetup(true)
    } finally {
      setCheckingDb(false)
    }
  }, [loadShopConfig, loadApplications, loadCategories, loadIndividuals, loadServices, loadPaymentCards, loadCompanies, loadTravelSuppliers])

  // ── Modal ──
  const [showModal, setShowModal] = useState(false)
  const [modalTab, setModalTab] = useState('individual') // 'individual' | 'company'
  const [formData, setFormData] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  // ── Add Company inline ──
  const [showAddCompany, setShowAddCompany] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [addingCompany, setAddingCompany] = useState(false)

  // ── Advance Type for Deposit Tab ──
  const [advanceType, setAdvanceType] = useState('company') // 'company' | 'individual'

  // ── Client Type for Travels Tab ──
  const [travelClientType, setTravelClientType] = useState('individual') // 'individual' | 'company'

  const handleTravelClientTypeChange = useCallback((type) => {
    setTravelClientType(type)
    setFormData(prev => ({
      ...prev,
      customerName: '',
      phone: '',
      emiratesId: '',
      companyId: ''
    }))
  }, [])

  const shopName = shopConfig?.shopName || 'First Choice'

  // ── Computed customer fee and balance ──
  const customerFee = useMemo(() => {
    const govt = parseFloat(formData.govtFee) || 0
    const typing = parseFloat(formData.typingFee) || 0
    return govt + typing
  }, [formData.govtFee, formData.typingFee])

  const balanceVal = useMemo(() => {
    const paid = parseFloat(formData.paidAmount) || 0
    return customerFee - paid
  }, [customerFee, formData.paidAmount])

  useEffect(() => {
    verifyDatabaseConnection()
  }, [verifyDatabaseConnection])

  // ── Setup submit ──
  const handleSetupSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!setupName.trim()) return
    try {
      setSetupSaving(true)
      const result = await window.api.saveShopConfig({ shopName: setupName.trim(), address: setupAddress.trim(), phone: setupPhone.trim() })
      if (result.success) { setShopConfig(result.data); setShowSetup(false) }
    } catch (err) { console.error(err) }
    finally { setSetupSaving(false) }
  }, [setupName, setupAddress, setupPhone])

  // ── Form handlers ──
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const updated = { ...prev, [name]: value }
      if (name === 'serviceId' && value) {
        const svc = services.find(s => s.id === parseInt(value, 10))
        if (svc) {
          updated.typingFee = String(svc.price)
          const nameLower = svc.name.toLowerCase()
          if (svc.name === 'Advance Deposit') {
            updated.govtPayment = 'N/A'
            updated.govtFee = '0'
            updated.govtEntity = ''
            if (updated.customerPayment === 'Advance') {
              updated.customerPayment = 'Cash'
            }
          } else if (
            nameLower.includes('print') ||
            nameLower.includes('cv') ||
            nameLower.includes('resume') ||
            nameLower.includes('photocopy')
          ) {
            updated.govtPayment = 'N/A'
            updated.govtFee = '0'
          } else {
            updated.govtFee = ''
          }
          const govt = parseFloat(updated.govtFee) || 0
          const typing = parseFloat(updated.typingFee) || 0
          updated.serviceCharge = String(govt + typing)
          updated.paidAmount = String(govt + typing)
        }
      }
      if (name === 'companyId' && value) {
        const comp = companiesRef.current.find(c => String(c.id) === value)
        if (comp && comp.advanceBalance > 0) {
          updated.customerPayment = 'Advance'
        } else if (updated.customerPayment === 'Advance') {
          updated.customerPayment = 'Cash'
        }
      }
      if (name === 'customerName' && value) {
        const ind = individuals.find(i => i.name.toLowerCase().trim() === value.toLowerCase().trim())
        if (ind && ind.advanceBalance > 0) {
          updated.customerPayment = 'Advance'
        } else if (updated.customerPayment === 'Advance') {
          updated.customerPayment = 'Cash'
        }
      }
      if (name === 'govtEntity' && value === 'N/A') {
        updated.govtFee = '0'
        const govt = parseFloat(updated.govtFee) || 0
        const typing = parseFloat(updated.typingFee) || 0
        updated.serviceCharge = String(govt + typing)
        updated.paidAmount = String(govt + typing)
      }
      if (modalTab === 'travels') {
        if (name === 'govtFee' || name === 'serviceCharge') {
          const price = parseFloat(updated.govtFee) || 0
          const ourFee = parseFloat(updated.serviceCharge) || 0
          updated.typingFee = String(ourFee - price)
          if (name === 'serviceCharge') {
            updated.paidAmount = String(ourFee)
          }
        }
      } else {
        if (name === 'govtFee' || name === 'typingFee') {
          const govt = parseFloat(updated.govtFee) || 0
          const typing = parseFloat(updated.typingFee) || 0
          updated.serviceCharge = String(govt + typing)
          updated.paidAmount = String(govt + typing)
        }
      }
      if (updated.customerPayment === 'Advance') {
        const govt = parseFloat(updated.govtFee) || 0
        const typing = parseFloat(updated.typingFee) || 0
        const fee = modalTab === 'travels' ? (parseFloat(updated.serviceCharge) || 0) : (govt + typing)
        updated.paidAmount = String(fee)
      }
      return updated
    })
  }, [services, individuals, modalTab])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setFormError(null)

    const isAdvance = modalTab === 'advance'
    const isTravels = modalTab === 'travels'

    if (isTravels) {
      if (!formData.govtEntity || !formData.govtEntity.trim()) {
        setFormError('Travel Supplier / Entity is required.')
        return
      }
      if (travelClientType === 'company' && !formData.companyId) {
        setFormError('Please select a company.')
        return
      }
      if (!formData.customerName.trim()) {
        setFormError(travelClientType === 'company' ? 'Traveller name is required.' : 'Customer name is required.')
        return
      }
      if (!formData.serviceId) {
        setFormError('Please select a service.')
        return
      }
    } else if (!isAdvance) {
      if (!formData.customerName.trim()) {
        setFormError('Customer name is required.')
        return
      }
      if (!formData.serviceId) {
        setFormError('Please select a service.')
        return
      }
      if (modalTab === 'company' && !formData.companyId) {
        setFormError('Please select a company.')
        return
      }
    } else {
      if (advanceType === 'company' && !formData.companyId) {
        setFormError('Please select a company.')
        return
      }
      if (advanceType === 'individual' && !formData.customerName.trim()) {
        setFormError('Please enter the customer name.')
        return
      }
      if (advanceType === 'individual' && !formData.phone.trim()) {
        setFormError('Phone number is compulsory for individual advance deposits.')
        return
      }
      const amt = parseFloat(formData.paidAmount) || 0
      if (amt <= 0) {
        setFormError('Please enter a valid positive deposit amount.')
        return
      }
    }

    // Resolve company name for storage
    let companyName = ''
    if ((modalTab === 'company' || (isAdvance && advanceType === 'company') || (modalTab === 'travels' && travelClientType === 'company')) && formData.companyId) {
      const comp = companiesRef.current.find(c => c.id === parseInt(formData.companyId, 10))
      companyName = comp ? comp.name : ''
    }

    try {
      setSaving(true)
      const selectedSvc = isAdvance
        ? services.find(s => s.name === 'Advance Deposit')
        : services.find(s => s.id === parseInt(formData.serviceId, 10))

      if (!selectedSvc) {
        setFormError(isAdvance ? 'System service "Advance Deposit" not found in database.' : 'Service not found.')
        setSaving(false)
        return
      }

      const isTravels = modalTab === 'travels'
      const govt = isAdvance ? 0 : (parseFloat(formData.govtFee) || 0)
      const customerFee = isTravels
        ? (parseFloat(formData.serviceCharge) || 0)
        : (isAdvance ? (parseFloat(formData.paidAmount) || 0) : (govt + (parseFloat(formData.typingFee) || 0)))
      const typing = isTravels ? (customerFee - govt) : (isAdvance ? 0 : (parseFloat(formData.typingFee) || 0))
      const govtPaid = isTravels ? (parseFloat(formData.govtPaid) || 0) : 0
      const paid = parseFloat(formData.paidAmount) || 0
      const balance = customerFee - paid
      const entity = isAdvance ? '' : (formData.govtEntity || '').trim()
      const isDeposit = selectedSvc && selectedSvc.name === 'Advance Deposit'
      const govtPayMode = 'N/A'

      const isCompanyClient = modalTab === 'company' || (isAdvance && advanceType === 'company') || (modalTab === 'travels' && travelClientType === 'company')
      const isIndividualClient = modalTab === 'individual' || (isAdvance && advanceType === 'individual') || (modalTab === 'travels' && travelClientType === 'individual')

      const isCardOrTransfer = formData.customerPayment === 'Card' || formData.customerPayment === 'Account Transfer' || formData.customerPayment === 'Cheque'
      const cardReceiptNet = 0
      const receivingAccount = null

      let result
      if (editingApplicationId) {
        result = await window.api.updateApplication({
          id: editingApplicationId,
          customerName: isAdvance
            ? (advanceType === 'company' ? 'Company Representative' : formData.customerName.trim())
            : formData.customerName.trim(),
          phone: formData.phone.trim(),
          emiratesId: isCompanyClient ? companyName : formData.emiratesId.trim(),
          customerType: isCompanyClient ? 'Company' : 'Individual',
          serviceId: selectedSvc.id,
          serviceCharge: customerFee,
          customerPayment: formData.customerPayment,
          paidAmount: paid,
          balance: balance,
          cardReceiptNet,
          receivingAccount,
          govtFee: govt,
          govtPayment: govtPayMode,
          govtEntity: isDeposit ? '' : entity,
          govtPaid: govtPaid,
          typingFee: typing,
          status: isAdvance ? 'Completed' : (formData.status || 'Pending')
        })
      } else {
        result = await window.api.createApplication({
          customerName: isAdvance
            ? (advanceType === 'company' ? 'Company Representative' : formData.customerName.trim())
            : formData.customerName.trim(),
          phone: formData.phone.trim(),
          emiratesId: isCompanyClient ? companyName : formData.emiratesId.trim(),
          customerType: isCompanyClient ? 'Company' : 'Individual',
          serviceId: selectedSvc.id,
          serviceCharge: customerFee,
          customerPayment: formData.customerPayment,
          paidAmount: paid,
          balance: balance,
          cardReceiptNet,
          receivingAccount,
          govtFee: govt,
          govtPayment: govtPayMode,
          govtEntity: isDeposit ? '' : entity,
          govtPaid: govtPaid,
          typingFee: typing,
          status: isAdvance ? 'Completed' : 'Pending',
          createdBy: currentUser?.username || ''
        })
      }
      if (result.success) {
        if (isIndividualClient && (saveToDirectory || isAdvance || balance > 0)) {
          try {
            await window.api.createIndividual({
              name: formData.customerName.trim(),
              phone: formData.phone.trim()
            })
          } catch (dirErr) {
            console.error('Failed to auto-save to directory:', dirErr)
          }
        }
        setShowModal(false)
        setFormData(emptyForm)
        setFormError(null)
        setEditingApplicationId(null)
        setSaveToDirectory(false)
        await loadApplications()
        await loadCompanies()
        await loadIndividuals()
      } else { setFormError(result.error) }
    } catch (err) { setFormError(err.message) }
    finally { setSaving(false) }
  }, [formData, modalTab, travelClientType, advanceType, companies, loadApplications, loadCompanies, loadIndividuals, editingApplicationId, currentUser, saveToDirectory])

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    setFormData(emptyForm)
    setFormError(null)
    setShowAddCompany(false)
    setNewCompanyName('')
    setEditingApplicationId(null)
    setSaveToDirectory(false)
    setSelectedCategoryId('')
    setShowAddCategory(false)
    setNewCategoryName('')
    setShowAddService(false)
    setNewServiceName('')
    setNewServiceCategoryId('')
    setShowAddGovtEntity(false)
    setNewGovtEntityName('')
    setShowAddTravelSupplier(false)
    setNewTravelSupplierName('')
  }, [])

  const handleEditApplicationClick = useCallback((appData) => {
    loadCategories()
    loadIndividuals()
    loadServices()
    loadPaymentCards()
    loadCompanies()
    loadGovtEntities()
    loadTravelSuppliers()

    setEditingApplicationId(appData.id)

    const isCompany = appData.customerType === 'Company'
    const isAdvance = appData.service?.name === 'Advance Deposit' && appData.service?.category?.name === 'System'
    const isTravels = appData.service?.category?.isTravel === true

    if (isAdvance) {
      setModalTab('advance')
      setAdvanceType(isCompany ? 'company' : 'individual')
    } else if (isTravels) {
      setModalTab('travels')
      setTravelClientType(isCompany ? 'company' : 'individual')
    } else {
      setModalTab(isCompany ? 'company' : 'individual')
    }

    let companyId = ''
    if (isCompany) {
      const comp = companiesRef.current.find(c => c.name === appData.emiratesId)
      if (comp) companyId = String(comp.id)
    }

    const svc = servicesRef.current.find(s => s.id === appData.serviceId)
    const catId = svc ? String(svc.categoryId) : ''
    setSelectedCategoryId(catId)

    setFormData({
      customerName: appData.customerName,
      phone: appData.phone || '',
      emiratesId: isCompany ? '' : appData.emiratesId || '',
      companyId: companyId,
      serviceId: String(appData.serviceId),
      serviceCharge: String(appData.serviceCharge),
      typingFee: String(appData.typingFee !== undefined && appData.typingFee !== null ? appData.typingFee : (appData.serviceCharge - appData.govtFee)),
      paidAmount: String(appData.paidAmount !== undefined && appData.paidAmount !== null ? appData.paidAmount : appData.serviceCharge),
      customerPayment: appData.customerPayment || 'Cash',
      govtFee: String(appData.govtFee),
      govtPayment: appData.govtPayment || 'Cash',
      govtEntity: appData.govtEntity || '',
      status: appData.status || 'Pending',
      govtPaid: String(appData.govtPaid !== undefined && appData.govtPaid !== null ? appData.govtPaid : '')
    })
    setSaveToDirectory(false)

    setShowModal(true)
  }, [loadCategories, loadIndividuals, loadServices, loadPaymentCards, loadCompanies, loadGovtEntities, loadTravelSuppliers, setTravelClientType, setAdvanceType])

  const handleDeleteApplicationClick = useCallback(async (appData) => {
    if (!window.confirm(`Are you sure you want to delete the application for "${appData.customerName}"?`)) return
    try {
      setLoading(true)
      const res = await window.api.deleteApplication({ id: appData.id })
      if (res.success) {
        await loadApplications()
        await loadCompanies()
        await loadIndividuals()
      } else {
        setError(res.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [loadApplications, loadCompanies, loadIndividuals])

  const handleExportApplications = useCallback(async (format) => {
    const headers = ['ID', 'Date', 'Customer Name', 'Customer Type', 'Company / EID', 'Service', 'Govt Fee (AED)', 'Typing Fee (AED)', 'Customer Fee (AED)', 'Paid Amount (AED)', 'Balance (AED)', 'Paid By', 'Staff', 'Status']
    const rows = filteredApplications.map(a => {
      const total = a.serviceCharge || 0
      const paid = a.paidAmount !== undefined && a.paidAmount !== null ? a.paidAmount : a.serviceCharge
      const balance = total - paid
      const dateStr = new Date(a.createdAt).toLocaleDateString('en-AE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      return [
        a.id,
        dateStr,
        a.customerName,
        a.customerType,
        a.emiratesId || '—',
        a.service?.name || '—',
        a.govtFee.toFixed(2),
        a.typingFee.toFixed(2),
        total.toFixed(2),
        paid.toFixed(2),
        balance.toFixed(2),
        a.customerPayment,
        a.createdBy || '—',
        a.status
      ]
    })

    const title = 'Customer Applications Report'
    const subtitle = `Date Range: ${formatDate(appStartDate)} to ${formatDate(appEndDate)}`
    const defaultName = `applications_report_${appStartDate}_to_${appEndDate}`

    if (format === 'excel') {
      const res = await exportToExcel(headers, rows, `${defaultName}.xls`)
      if (res.success) alert('Report exported successfully!')
      else if (res.error !== 'Cancelled') alert(`Export failed: ${res.error}`)
    } else {
      const summaryCards = [
        { label: 'Total Applications', value: String(filteredApplications.length) },
        { label: 'Total Sales', value: `AED ${filteredApplications.reduce((s, a) => s + (a.serviceCharge || 0), 0).toFixed(2)}` },
        { label: 'Total Profit', value: `AED ${filteredApplications.reduce((s, a) => s + (a.typingFee || 0), 0).toFixed(2)}` }
      ]
      const res = await exportToPDF(shopConfig, title, subtitle, headers, rows, `${defaultName}.pdf`, summaryCards)
      if (res.success) alert('Report exported successfully!')
      else if (res.error !== 'Cancelled') alert(`Export failed: ${res.error}`)
    }
  }, [filteredApplications, appStartDate, appEndDate, shopConfig])

  const handleOpenModal = useCallback(async (tab = 'individual', preselectedData = {}) => {
    setShowModal(true)
    setModalTab(tab)
    setFormData({
      ...emptyForm,
      ...preselectedData
    })
    setSaveToDirectory(false)
    setSelectedCategoryId('')
    await loadCategories()
    await loadIndividuals()
    await loadServices()
    await loadPaymentCards()
    await loadCompanies()
    await loadGovtEntities()
    await loadTravelSuppliers()
  }, [loadCategories, loadIndividuals, loadServices, loadPaymentCards, loadCompanies, loadGovtEntities, loadTravelSuppliers])

  // ── Tab switch ──
  const handleTabSwitch = useCallback((tab) => {
    setModalTab(tab)
    setFormData(emptyForm)
    setFormError(null)
    setShowAddCompany(false)
    setNewCompanyName('')
    setAdvanceType('company')
    setTravelClientType('individual')
  }, [setAdvanceType, setTravelClientType])

  // ── Add company inline ──
  const handleAddCompany = useCallback(async () => {
    if (!newCompanyName.trim()) return
    try {
      setAddingCompany(true)
      const result = await window.api.createCompany({ name: newCompanyName.trim() })
      if (result.success) {
        await loadCompanies()
        setFormData(prev => ({ ...prev, companyId: String(result.data.id) }))
        setNewCompanyName('')
        setShowAddCompany(false)
      } else {
        setFormError(result.error)
      }
    } catch (err) { setFormError(err.message) }
    finally { setAddingCompany(false) }
  }, [newCompanyName, loadCompanies])

  // ── Add Category inline ──
  const handleAddCategoryInline = useCallback(async () => {
    if (!newCategoryName.trim()) return
    try {
      setAddingCategory(true)
      const result = await window.api.createCategory({
        name: newCategoryName.trim(),
        isTravel: modalTab === 'travels'
      })
      if (result.success) {
        await loadCategories()
        setSelectedCategoryId(String(result.data.id))
        setNewCategoryName('')
        setShowAddCategory(false)
      } else {
        setFormError(result.error)
      }
    } catch (err) { setFormError(err.message) }
    finally { setAddingCategory(false) }
  }, [newCategoryName, loadCategories, modalTab])

  // ── Add Service inline ──
  const handleAddServiceInline = useCallback(async () => {
    if (!newServiceName.trim()) return
    const catId = newServiceCategoryId || selectedCategoryId
    if (!catId) {
      setFormError('Please select or specify a category for the new service.')
      return
    }
    try {
      setAddingService(true)
      const result = await window.api.createService({
        name: newServiceName.trim(),
        price: 0,
        categoryId: parseInt(catId, 10)
      })
      if (result.success) {
        await loadServices()
        setFormData(prev => ({
          ...prev,
          serviceId: String(result.data.id)
        }))
        setNewServiceName('')
        setNewServiceCategoryId('')
        setShowAddService(false)
      } else {
        setFormError(result.error)
      }
    } catch (err) { setFormError(err.message) }
    finally { setAddingService(false) }
  }, [newServiceName, newServiceCategoryId, selectedCategoryId, loadServices])

  // ── Add Govt Entity inline ──
  const handleAddGovtEntityInline = useCallback(async () => {
    const trimmedName = newGovtEntityName.trim()
    if (!trimmedName) return
    try {
      setAddingGovtEntity(true)
      const result = await window.api.createGovtEntity({ name: trimmedName })
      if (result.success) {
        await loadGovtEntities()
        setFormData(prev => {
          const updated = { ...prev, govtEntity: result.data.name }
          if (result.data.name === 'N/A') {
            updated.govtFee = '0'
            const govt = parseFloat(updated.govtFee) || 0
            const typing = parseFloat(updated.typingFee) || 0
            updated.serviceCharge = String(govt + typing)
            updated.paidAmount = String(govt + typing)
          }
          return updated
        })
        setNewGovtEntityName('')
        setShowAddGovtEntity(false)
      } else {
        setFormError(result.error)
      }
    } catch (err) {
      setFormError(err.message)
    } finally {
      setAddingGovtEntity(false)
    }
  }, [newGovtEntityName, loadGovtEntities])

  // ── Add Travel Supplier inline ──
  const handleAddTravelSupplierInline = useCallback(async () => {
    const trimmedName = newTravelSupplierName.trim()
    if (!trimmedName) return
    try {
      setAddingTravelSupplier(true)
      const result = await window.api.createTravelSupplier({ name: trimmedName })
      if (result.success) {
        await loadTravelSuppliers()
        setFormData(prev => ({ ...prev, govtEntity: result.data.name }))
        setNewTravelSupplierName('')
        setShowAddTravelSupplier(false)
      } else {
        setFormError(result.error)
      }
    } catch (err) {
      setFormError(err.message)
    } finally {
      setAddingTravelSupplier(false)
    }
  }, [newTravelSupplierName, loadTravelSuppliers])



  // ── Grid columns ──
  const columnDefs = useMemo(() => [
    { headerName: 'ID', field: 'id', width: 70, sortable: true, filter: true },
    { headerName: 'Customer', field: 'customerName', flex: 1.3, minWidth: 150, sortable: true, filter: true },
    { headerName: 'Type', field: 'customerType', width: 110, sortable: true, filter: true, cellRenderer: CustomerTypeRenderer },
    { headerName: 'Company / EID', field: 'emiratesId', flex: 1, minWidth: 130, sortable: true, filter: true },
    { headerName: 'Service', field: 'service', flex: 1, minWidth: 140, sortable: true, filter: true, valueGetter: (p) => p.data?.service?.name || '—' },
    { headerName: 'Govt Fee', field: 'govtFee', width: 100, sortable: true, valueFormatter: (p) => p.value?.toFixed(2) },
    { headerName: 'Typing Fee', field: 'typingFee', width: 100, sortable: true, valueFormatter: (p) => p.value?.toFixed(2), cellStyle: { color: '#34d399' } },
    { headerName: 'Customer Fee', field: 'serviceCharge', width: 110, sortable: true, valueFormatter: (p) => p.value?.toFixed(2) },
    { headerName: 'Paid Amount', field: 'paidAmount', width: 110, sortable: true, valueFormatter: (p) => (p.value !== undefined && p.value !== null ? p.value : p.data?.serviceCharge)?.toFixed(2) },
    {
      headerName: 'Balance',
      field: 'balance',
      width: 100,
      sortable: true,
      valueGetter: (p) => {
        const total = p.data?.serviceCharge || 0
        const paid = (p.data?.paidAmount !== undefined && p.data?.paidAmount !== null ? p.data?.paidAmount : p.data?.serviceCharge) || 0
        return total - paid
      },
      valueFormatter: (p) => p.value?.toFixed(2),
      cellStyle: (p) => p.value > 0 ? { color: '#ef4444', fontWeight: 600 } : null
    },
    { headerName: 'Paid To Entity', field: 'govtEntity', width: 120, sortable: true, filter: true },
    { headerName: 'Paid By', field: 'customerPayment', width: 110, sortable: true, filter: true },
    { headerName: 'Staff', field: 'createdBy', width: 100, sortable: true, filter: true },
    { headerName: 'Date', field: 'createdAt', width: 120, sortable: true, cellRenderer: DateRenderer },
    { headerName: 'Status', field: 'status', width: 120, sortable: true, filter: true, cellRenderer: StatusRenderer },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 140,
      sortable: false,
      filter: false,
      cellRenderer: ActionsRenderer,
      cellRendererParams: {
        onEdit: handleEditApplicationClick,
        onDelete: handleDeleteApplicationClick
      }
    }
  ], [handleEditApplicationClick, handleDeleteApplicationClick])

  const defaultColDef = useMemo(() => ({ resizable: true }), [])

  // ── Stats ──
  const stats = useMemo(() => {
    const total = applications.length
    const totalCharge = applications.reduce((s, a) => s + (a.serviceCharge || 0), 0)
    const totalProfit = applications.reduce((s, a) => s + (a.typingFee || 0), 0)
    const pending = applications.filter(c => c.status === 'Pending').length
    return { total, totalCharge, totalProfit, pending }
  }, [applications])

  // ── Navigation ──
  const handleNav = useCallback((page) => {
    setCurrentPage(page)
    setGridFilter('all')
    if (page === 'applications') { loadApplications(); loadServices(); loadCompanies() }
  }, [loadApplications, loadServices, loadCompanies])

  const handleDashboardNavigate = useCallback((page, filterType) => {
    setCurrentPage(page)
    setGridFilter(filterType)
    if (page === 'applications') { loadApplications(); loadServices(); loadCompanies() }
  }, [loadApplications, loadServices, loadCompanies])

  const handleDashboardOpenFolder = useCallback((type, parentId) => {
    if (type === 'Company') {
      setAppCompanyId(parentId)
      setCurrentPage('company')
    } else if (type === 'Individual') {
      setAppIndividualId(parentId)
      setCurrentPage('individual')
    }
  }, [])

  const navItems = useMemo(() => {
    const items = [
      { icon: <HomeIcon size={18} />, label: 'Home', page: 'dashboard' },
      { icon: <ApplicationIcon size={18} />, label: 'Applications', page: 'applications' },
      { icon: <CompanyIcon size={18} />, label: 'Company', page: 'company' },
      { icon: <IndividualIcon size={18} />, label: 'Individual', page: 'individual' },
      { icon: <ReportIcon size={18} />, label: 'Daily Report', page: 'daily-report' },
      { icon: <ReportIcon size={18} />, label: 'Monthly Report', page: 'monthly-report' },
      { icon: <CardIcon size={18} />, label: 'Accounts', page: 'accounts' },
      { icon: <PlaneIcon size={18} />, label: 'Travels', page: 'travels-ledger' },
      { icon: <BillIcon size={18} />, label: 'Expenses', page: 'expenses' }
    ]
    if (currentUser?.role === 'Admin') {
      items.push({ icon: <SettingsIcon size={18} />, label: 'Admin Settings', page: 'settings' })
    }
    return items
  }, [currentUser])

  // ── Render content ──
  const renderContent = () => {
    if (currentPage === 'dashboard') {
      return (
        <HomeDashboard
          applications={applications}
          companies={companies}
          individuals={individuals}
          shopName={shopName}
          onNavigate={handleDashboardNavigate}
          onOpenFolder={handleDashboardOpenFolder}
          onNewApplication={() => handleOpenModal('individual')}
        />
      )
    }
    if (currentPage === 'settings') {
      if (currentUser?.role !== 'Admin') {
        return <div className="p-4"><Alert variant="danger">Access Denied: Admin permissions required.</Alert></div>
      }
      return <AdminSettings shopConfig={shopConfig} onShopConfigSaved={(cfg) => setShopConfig(cfg)} currentUser={currentUser} />
    }
    if (currentPage === 'daily-report') return <DailyReport />
    if (currentPage === 'monthly-report') return <MonthlyReport />
    if (currentPage === 'accounts') return <Accounts />
    if (currentPage === 'expenses') return <ExpensesManagement />
    if (currentPage === 'travels-ledger') {
      return (
        <TravelsLedger
          parentApplications={applications}
          parentSuppliers={travelSuppliers}
          parentCards={paymentCards}
          onNewApplication={(supplierName) => {
            handleOpenModal('travels', supplierName ? { govtEntity: supplierName } : {})
          }}
          onEditApplication={(appId) => {
            const app = applications.find(a => a.id === appId)
            if (app) handleEditApplicationClick(app)
          }}
        />
      )
    }
    if (currentPage === 'company') {
      return (
        <CompanyManagement
          initialCompanyId={appCompanyId}
          onClearInitialId={() => setAppCompanyId(null)}
          onNewApplication={(company) => handleOpenModal('company', { companyId: String(company.id) })}
        />
      )
    }
    if (currentPage === 'individual') {
      return (
        <IndividualManagement
          initialIndividualId={appIndividualId}
          onClearInitialId={() => setAppIndividualId(null)}
          onNewApplication={(individual) => handleOpenModal('individual', { customerName: individual.name, phone: individual.phone || '' })}
        />
      )
    }

    return (
      <>
        <div className="page-header">
          <div className="page-header-left">
            <h1>Applications</h1>
            <p>Manage and track all customer service applications</p>
          </div>
          <div className="page-header-actions" style={{ display: 'flex', gap: 8 }}>
            <Dropdown align="end" className="d-inline">
              <Dropdown.Toggle as="button" className="btn-outline-subtle" id="btn-export" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ExportIcon size={14} /> Export
              </Dropdown.Toggle>
              <Dropdown.Menu className={theme === 'dark' ? 'dropdown-menu-dark' : 'dropdown-menu-light shadow'}>
                <Dropdown.Item onClick={() => handleExportApplications('excel')}>
                  Export Excel (.xls)
                </Dropdown.Item>
                <Dropdown.Item onClick={() => handleExportApplications('pdf')}>
                  Export PDF (.pdf)
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            <button className="btn-primary-glow" id="btn-new-application" onClick={() => handleOpenModal('individual')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <PlusIcon size={14} /> New
            </button>
          </div>
        </div>
        <div className="stat-cards">
          <div className="stat-card">
            <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--accent-primary)' }}>
              <ApplicationIcon size={24} />
            </div>
            <div className="stat-card-value">{stats.total}</div>
            <div className="stat-card-label">Total Applications</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--success)' }}>
              <SalesIcon size={24} />
            </div>
            <div className="stat-card-value">{stats.totalCharge.toFixed(0)}</div>
            <div className="stat-card-label">Total Sales (AED)</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--info)' }}>
              <SaveIcon size={24} />
            </div>
            <div className="stat-card-value">{stats.totalProfit.toFixed(0)}</div>
            <div className="stat-card-label">Total Profit (AED)</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--warning)' }}>
              <PendingIcon size={24} />
            </div>
            <div className="stat-card-value">{stats.pending}</div>
            <div className="stat-card-label">Pending</div>
          </div>
        </div>

        {gridFilter !== 'all' && (
          <Alert variant="info" className="d-flex align-items-center justify-content-between py-2 px-3 mb-3 border-0 rounded-3 shadow-sm" style={{ fontSize: '0.9rem', background: 'rgba(0, 124, 195, 0.15)', color: 'var(--text-primary)' }}>
            <span>
              <ReportIcon size={14} className="me-1 align-middle text-info" /> Showing <strong>
                {gridFilter === 'credit' ? 'Outstanding Customer Credits (To Receive)' :
                  gridFilter === 'credit-company' ? 'Outstanding Company Credits (To Receive)' :
                    gridFilter === 'credit-individual' ? 'Outstanding Individual Credits (To Receive)' :
                      'Pending Government Payouts (To be Paid Out)'}
              </strong> entries from Dashboard.
            </span>
            <Button variant="outline-info" size="sm" onClick={() => setGridFilter('all')} style={{ padding: '2px 8px', fontSize: '0.8rem', color: 'var(--text-primary)', borderColor: 'rgba(0, 124, 195, 0.3)' }}>
              Clear Filter
            </Button>
          </Alert>
        )}

        {error && <Alert variant="danger" className="mb-3" dismissible onClose={() => setError(null)}><strong>Error:</strong> {error}</Alert>}

        <div className="grid-container">
          <div className="grid-toolbar">
            <div className="grid-toolbar-left">
              <h3>Customer Applications</h3>
              <span className="record-count">{filteredApplications.length} records</span>
            </div>
            <div className="grid-toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="date" className="grid-filter-input" value={appStartDate} onChange={(e) => setAppStartDate(e.target.value)} style={{ width: 130, padding: '4px 8px', fontSize: '0.8rem' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
              <input type="date" className="grid-filter-input" value={appEndDate} onChange={(e) => setAppEndDate(e.target.value)} style={{ width: 130, padding: '4px 8px', fontSize: '0.8rem' }} />
              <input className="grid-filter-input" type="text" placeholder="Filter records..." value={quickFilter} onChange={(e) => setQuickFilter(e.target.value)} />

              <Dropdown align="end" className="d-inline">
                <Dropdown.Toggle as="button" className="btn-outline-subtle" id="col-selector-dropdown">
                  Columns
                </Dropdown.Toggle>
                <Dropdown.Menu className={`${theme === 'dark' ? 'dropdown-menu-dark' : 'dropdown-menu-light shadow'} p-3`} style={{ minWidth: 220 }}>
                  <h6 className="dropdown-header px-0 pt-0 pb-2 border-bottom text-start" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem' }}>Visible Columns</h6>
                  <div className="pt-2 d-flex flex-column gap-2" style={{ maxHeight: 250, overflowY: 'auto' }}>
                    {Object.keys(visibleCols).map((col) => (
                      <label key={col} className="d-flex align-items-center text-start" style={{ cursor: 'pointer', fontSize: '0.85rem', gap: 8, color: 'var(--text-primary)', fontWeight: 500, margin: 0, userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={visibleCols[col]}
                          onChange={() => handleToggleColumn(col)}
                          style={{ cursor: 'pointer' }}
                        />
                        {getFriendlyColName(col)}
                      </label>
                    ))}
                  </div>
                </Dropdown.Menu>
              </Dropdown>

              <button className="btn-outline-subtle" onClick={loadApplications} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshIcon size={14} /> Refresh
              </button>
            </div>
          </div>
          <div style={{ height: 480, width: '100%' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                <Spinner animation="border" variant="light" size="sm" />
                <span style={{ color: 'var(--text-secondary)' }}>Loading...</span>
              </div>
            ) : (
              <AgGridReact
                ref={gridRef}
                theme={theme === 'light' ? lightGridTheme : darkGridTheme}
                modules={[AllCommunityModule]}
                rowData={filteredApplications}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                animateRows={true}
                rowSelection={{ mode: 'singleRow', checkboxes: false }}
                quickFilterText={quickFilter}
                pagination={true}
                paginationPageSize={15}
                onGridReady={onGridReady}
                onColumnMoved={saveColumnState}
                onColumnResized={saveColumnState}
                onSortChanged={saveColumnState}
              />
            )}
          </div>
        </div>
      </>
    )
  }

  // ── Category and Service selection (shared between tabs) ──
  const renderCategoryAndServiceSection = () => {
    const isTravelsTab = modalTab === 'travels'
    const tabCategories = categories.filter((cat) => (isTravelsTab ? cat.isTravel === true : cat.isTravel === false))
    const tabCategoryIds = tabCategories.map((c) => c.id)

    const filteredServices = selectedCategoryId
      ? services.filter((s) => s.categoryId === parseInt(selectedCategoryId, 10))
      : services.filter((s) => tabCategoryIds.includes(s.categoryId))

    return (
      <>
        {/* Category Dropdown with inline add button */}
        <Form.Group className="mb-3">
          <Form.Label className="modal-field-label">Category</Form.Label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Form.Select
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value)
                // If service is selected and doesn't belong to new category, reset serviceId
                if (e.target.value && formData.serviceId) {
                  const svc = services.find(s => s.id === parseInt(formData.serviceId, 10))
                  if (svc && String(svc.categoryId) !== e.target.value) {
                    setFormData(prev => ({ ...prev, serviceId: '', serviceCharge: '' }))
                  }
                }
              }}
              style={{ flex: 1 }}
            >
              <option value="">All Categories</option>
              {tabCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </Form.Select>
            <button
              type="button"
              className="btn-outline-subtle d-flex align-items-center justify-content-center"
              style={{ whiteSpace: 'nowrap', padding: '6px 14px' }}
              onClick={() => {
                setShowAddCategory(!showAddCategory)
                setShowAddService(false)
              }}
            >
              {showAddCategory ? <CloseIcon size={12} /> : <PlusIcon size={12} />}
            </button>
          </div>
        </Form.Group>

        {showAddCategory && (
          <div className="modal-inline-add mb-3">
            <Form.Control
              type="text"
              placeholder="New category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn-primary-glow"
              style={{ padding: '6px 16px', border: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={addingCategory || !newCategoryName.trim()}
              onClick={handleAddCategoryInline}
            >
              {addingCategory ? <Spinner animation="border" size="sm" /> : <><SaveIcon size={12} /> Save</>}
            </button>
          </div>
        )}

        {/* Service Dropdown with inline add button */}
        <Form.Group className="mb-3">
          <Form.Label className="modal-field-label">Service <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Form.Select
              name="serviceId"
              value={formData.serviceId}
              onChange={handleInputChange}
              style={{ flex: 1 }}
            >
              <option value="">Select a service...</option>
              {filteredServices.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name} ({svc.category?.name})
                </option>
              ))}
            </Form.Select>
            <button
              type="button"
              className="btn-outline-subtle d-flex align-items-center justify-content-center"
              style={{ whiteSpace: 'nowrap', padding: '6px 14px' }}
              onClick={() => {
                setShowAddService(!showAddService)
                setShowAddCategory(false)
                if (selectedCategoryId) {
                  setNewServiceCategoryId(selectedCategoryId)
                }
              }}
            >
              {showAddService ? <CloseIcon size={12} /> : <PlusIcon size={12} />}
            </button>
          </div>
        </Form.Group>

        {showAddService && (
          <div className="modal-inline-add mb-3" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <div style={{ flex: '1 1 100%', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Add New Service</div>
            <Form.Control
              type="text"
              placeholder="Service name"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              style={{ flex: '2 1 150px' }}
            />
            <Form.Select
              value={newServiceCategoryId || selectedCategoryId}
              onChange={(e) => setNewServiceCategoryId(e.target.value)}
              style={{ flex: '1 1 120px' }}
            >
              <option value="">Category...</option>
              {tabCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </Form.Select>
            <button
              type="button"
              className="btn-primary-glow"
              style={{ padding: '6px 16px', border: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={addingService || !newServiceName.trim()}
              onClick={handleAddServiceInline}
            >
              {addingService ? <Spinner animation="border" size="sm" /> : <><SaveIcon size={12} /> Save Service</>}
            </button>
          </div>
        )}
      </>
    )
  }

  // ── Payment fields (shared between tabs) ──
  const renderPaymentSection = () => {
    const selectedSvc = services.find(s => s.id === parseInt(formData.serviceId, 10))
    const isDeposit = selectedSvc && selectedSvc.name === 'Advance Deposit'

    if (modalTab === 'travels') {
      const price = parseFloat(formData.govtFee) || 0
      const ourFee = parseFloat(formData.serviceCharge) || 0
      const paid = parseFloat(formData.govtPaid) || 0
      const travelsBalance = price - paid
      const serviceChargeProfit = ourFee - price
      const custPaid = parseFloat(formData.paidAmount) || 0
      const custBalance = ourFee - custPaid

      return (
        <div className="modal-payment-section" style={{ marginTop: 0 }}>
          <div className="modal-section-title"><SalesIcon size={18} className="me-2" />Payment Details</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Group>
              <Form.Label className="modal-field-label">Price (typing center get for)</Form.Label>
              <Form.Control type="number" step="0.01" min="0" name="govtFee" placeholder="0.00" value={formData.govtFee} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group>
              <Form.Label className="modal-field-label">Our Fee (we give to customer for)</Form.Label>
              <Form.Control type="number" step="0.01" min="0" name="serviceCharge" placeholder="0.00" value={formData.serviceCharge} onChange={handleInputChange} />
            </Form.Group>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <Form.Group>
              <Form.Label className="modal-field-label">Paid (money we pay to travels)</Form.Label>
              <Form.Control type="number" step="0.01" min="0" name="govtPaid" placeholder="0.00" value={formData.govtPaid || ''} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group>
              <Form.Label className="modal-field-label">Balance (to travels)</Form.Label>
              <Form.Control type="text" readOnly value={`AED ${travelsBalance.toFixed(2)}`} style={{ fontWeight: 600, color: travelsBalance > 0 ? 'var(--danger)' : 'var(--success)' }} />
            </Form.Group>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <Form.Group>
              <Form.Label className="modal-field-label">Service Charge (profit)</Form.Label>
              <Form.Control type="text" readOnly value={`AED ${serviceChargeProfit.toFixed(2)}`} style={{ fontWeight: 600, color: serviceChargeProfit >= 0 ? 'var(--success)' : 'var(--danger)' }} />
            </Form.Group>
            <Form.Group>
              <Form.Label className="modal-field-label">Customer Paid</Form.Label>
              <Form.Control type="number" step="0.01" min="0" name="paidAmount" placeholder="0.00" value={formData.paidAmount} onChange={handleInputChange} disabled={formData.customerPayment === 'Advance'} />
            </Form.Group>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <Form.Group>
              <Form.Label className="modal-field-label">Paid By</Form.Label>
              <Form.Select name="customerPayment" value={formData.customerPayment} onChange={handleInputChange}>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Cheque">Cheque</option>
                <option value="Account Transfer">Account Transfer</option>
                <option value="Credit">Credit</option>
                <option value="Advance">Advance</option>
              </Form.Select>
              {formData.customerPayment === 'Advance' && (() => {
                let currentAdvance = 0
                if (travelClientType === 'company' && formData.companyId) {
                  const comp = companies.find(c => String(c.id) === formData.companyId)
                  if (comp) currentAdvance = comp.advanceBalance || 0
                } else if (travelClientType === 'individual' && formData.customerName) {
                  const ind = individuals.find(i => i.name.toLowerCase().trim() === formData.customerName.toLowerCase().trim())
                  if (ind) currentAdvance = ind.advanceBalance || 0
                }
                const remaining = currentAdvance - (parseFloat(formData.paidAmount) || 0)
                return (
                  <div className="mt-2" style={{ fontSize: '0.82rem', lineHeight: '1.4' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      Available Advance: <strong className="text-success">AED {currentAdvance.toFixed(2)}</strong>
                    </div>
                    <div style={{ color: remaining < 0 ? 'var(--danger)' : 'var(--text-secondary)', marginTop: 2, fontWeight: remaining < 0 ? 700 : 500 }}>
                      Remaining: <strong>AED {remaining.toFixed(2)}</strong>
                      {remaining < 0 && <span className="d-block text-danger mt-1"><WarningIcon size={14} className="me-1 text-danger" />Insufficient Advance Balance</span>}
                    </div>
                  </div>
                )
              })()}
            </Form.Group>
            <Form.Group>
              <Form.Label className="modal-field-label">Customer Balance</Form.Label>
              <Form.Control type="text" readOnly value={`AED ${custBalance.toFixed(2)}`} style={{ color: custBalance > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }} />
            </Form.Group>
          </div>

          {editingApplicationId && (
            <div style={{ marginTop: 12 }}>
              <Form.Group>
                <Form.Label className="modal-field-label">Status</Form.Label>
                <Form.Select name="status" value={formData.status} onChange={handleInputChange}>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Rejected">Rejected</option>
                  <option value="In Progress">In Progress</option>
                </Form.Select>
              </Form.Group>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="modal-payment-section" style={{ marginTop: 0 }}>
        <div className="modal-section-title"><SalesIcon size={18} className="me-2" />Payment Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Group>
            <Form.Label className="modal-field-label">Govt Fee (AED)</Form.Label>
            <Form.Control type="number" step="0.01" min="0" name="govtFee" placeholder="0.00" value={isDeposit ? '0' : formData.govtFee} onChange={handleInputChange} disabled={isDeposit} />
          </Form.Group>
          <Form.Group>
            <Form.Label className="modal-field-label">Typing Fee (AED)</Form.Label>
            <Form.Control type="number" step="0.01" min="0" name="typingFee" placeholder="0.00" value={formData.typingFee} onChange={handleInputChange} />
          </Form.Group>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <Form.Group>
            <Form.Label className="modal-field-label">Customer Fee (AED)</Form.Label>
            <Form.Control type="text" readOnly value={`AED ${customerFee.toFixed(2)}`} style={{ fontWeight: 600 }} />
          </Form.Group>
          <Form.Group>
            <Form.Label className="modal-field-label">Paid Amount (AED)</Form.Label>
            <Form.Control type="number" step="0.01" min="0" name="paidAmount" placeholder="0.00" value={formData.paidAmount} onChange={handleInputChange} disabled={formData.customerPayment === 'Advance'} />
          </Form.Group>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <Form.Group>
            <Form.Label className="modal-field-label">Paid By</Form.Label>
            <Form.Select name="customerPayment" value={formData.customerPayment} onChange={handleInputChange}>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Cheque">Cheque</option>
              <option value="Account Transfer">Account Transfer</option>
              <option value="Credit">Credit</option>
              {!isDeposit && <option value="Advance">Advance</option>}
            </Form.Select>
            {formData.customerPayment === 'Advance' && (() => {
              let currentAdvance = 0
              if (modalTab === 'company' && formData.companyId) {
                const comp = companies.find(c => String(c.id) === formData.companyId)
                if (comp) currentAdvance = comp.advanceBalance || 0
              } else if (modalTab === 'individual' && formData.customerName) {
                const ind = individuals.find(i => i.name.toLowerCase().trim() === formData.customerName.toLowerCase().trim())
                if (ind) currentAdvance = ind.advanceBalance || 0
              }
              const remaining = currentAdvance - (parseFloat(formData.paidAmount) || 0)
              return (
                <div className="mt-2" style={{ fontSize: '0.82rem', lineHeight: '1.4' }}>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    Available Advance: <strong className="text-success">AED {currentAdvance.toFixed(2)}</strong>
                  </div>
                  <div style={{ color: remaining < 0 ? 'var(--danger)' : 'var(--text-secondary)', marginTop: 2, fontWeight: remaining < 0 ? 700 : 500 }}>
                    Remaining: <strong>AED {remaining.toFixed(2)}</strong>
                    {remaining < 0 && <span className="d-block text-danger mt-1"><WarningIcon size={14} className="me-1 text-danger" />Insufficient Advance Balance</span>}
                  </div>
                </div>
              )
            })()}
          </Form.Group>
          <Form.Group>
            <Form.Label className="modal-field-label">Balance (AED)</Form.Label>
            <Form.Control type="text" readOnly value={`AED ${balanceVal.toFixed(2)}`} style={{ color: balanceVal > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }} />
          </Form.Group>
        </div>
        {modalTab !== 'travels' && (
          <>
            <div style={{ marginTop: 12 }}>
              <Form.Group>
                <Form.Label className="modal-field-label">Entity</Form.Label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Form.Select
                    name="govtEntity"
                    value={isDeposit ? '' : (formData.govtEntity || '')}
                    onChange={handleInputChange}
                    disabled={isDeposit}
                    style={{ flex: 1 }}
                  >
                    <option value="">Select Entity...</option>
                    {govtEntities.map((ent) => (
                      <option key={ent.id} value={ent.name}>{ent.name}</option>
                    ))}
                  </Form.Select>
                  <button
                    type="button"
                    className="btn-outline-subtle d-flex align-items-center justify-content-center"
                    style={{ whiteSpace: 'nowrap', padding: '4px 10px' }}
                    disabled={isDeposit}
                    onClick={() => {
                      setShowAddGovtEntity(!showAddGovtEntity)
                    }}
                  >
                    {showAddGovtEntity ? <CloseIcon size={12} /> : <PlusIcon size={12} />}
                  </button>
                </div>
              </Form.Group>
            </div>
            {showAddGovtEntity && (
              <div className="modal-inline-add" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Form.Control
                  type="text"
                  placeholder="New govt entity name"
                  value={newGovtEntityName}
                  onChange={(e) => setNewGovtEntityName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn-primary-glow"
                  style={{ padding: '6px 16px', border: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                  disabled={addingGovtEntity || !newGovtEntityName.trim()}
                  onClick={handleAddGovtEntityInline}
                >
                  {addingGovtEntity ? <Spinner animation="border" size="sm" /> : <><SaveIcon size={12} /> Save</>}
                </button>
              </div>
            )}
          </>
        )}
        {editingApplicationId && (
          <div style={{ marginTop: 12 }}>
            <Form.Group>
              <Form.Label className="modal-field-label">Status</Form.Label>
              <Form.Select name="status" value={formData.status} onChange={handleInputChange}>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Rejected">Rejected</option>
                <option value="In Progress">In Progress</option>
              </Form.Select>
            </Form.Group>
          </div>
        )}
      </div>
    )
  }

  if (checkingDb) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundImage: `url(${screenBg})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative background glows */}
        <div style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          background: 'rgba(16, 185, 129, 0.06)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          top: '20%',
          left: '15%'
        }} />
        <div style={{
          position: 'absolute',
          width: '350px',
          height: '350px',
          background: 'rgba(92, 6, 30, 0.08)',
          borderRadius: '50%',
          filter: 'blur(100px)',
          bottom: '15%',
          right: '10%'
        }} />

        <div style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          borderRadius: '24px',
          padding: '40px 50px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.1)',
          zIndex: 10
        }}>
          <img src={fcLogo} alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 24 }} />
          
          <div className="mb-4" style={{ position: 'relative', width: '3.5rem', height: '3.5rem' }}>
            <Spinner
              animation="border"
              style={{
                width: '3.5rem',
                height: '3.5rem',
                color: '#5c061e',
                borderWidth: '4px',
                position: 'absolute',
                top: 0,
                left: 0
              }}
            />
            <Spinner
              animation="grow"
              size="sm"
              style={{
                position: 'absolute',
                top: 'calc(50% - 7px)',
                left: 'calc(50% - 7px)',
                color: '#10b981',
                width: '14px',
                height: '14px'
              }}
            />
          </div>
          
          <h5 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: '0.5px', margin: 0, color: '#5c061e' }}>
            Connecting to Database...
          </h5>
          <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 8 }}>
            Please wait while we establish a secure connection
          </span>
        </div>
      </div>
    )
  }

  if (showDbConnectionSetup) {
    const handleDbSetupSubmit = async (e) => {
      e.preventDefault()
      setDbSetupSaving(true)
      setDbSetupError(null)
      const testUrl = buildDatabaseUrl(dbConfig.user, dbConfig.password, dbConfig.host, dbConfig.port, dbConfig.name)
      try {
        const testRes = await window.api.testDbConnection({ databaseUrl: testUrl })
        if (!testRes.success) {
          setDbSetupError(`Connection failed: ${testRes.error}`)
          setDbSetupSaving(false)
          return
        }

        const saveRes = await window.api.saveDbConfig({ databaseUrl: testUrl })
        if (saveRes.success) {
          alert('Database connection configured! The application will restart to apply the settings.')
          window.api.relaunchApp()
        } else {
          setDbSetupError(saveRes.error)
        }
      } catch (err) {
        setDbSetupError(err.message)
      } finally {
        setDbSetupSaving(false)
      }
    }

    const handleDbConfigChange = (e) => {
      const { name, value } = e.target
      setDbConfig(prev => ({ ...prev, [name]: value }))
    }

    return (
      <div className="login-container" style={{ backgroundImage: `url(${screenBg})`, backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: 'cover' }}>
        <div className="login-box" style={{ maxWidth: 430 }}>
          <Card className="login-card shadow-lg" style={{ borderTop: '4px solid #113b2e' }}>
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <img src={fcLogo} alt="Logo" style={{ width: 66, height: 66, objectFit: 'contain', display: 'block', margin: '0 auto 16px' }} />
                <h3 className="login-shop-name" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <SettingsIcon size={24} style={{ color: '#5c061e' }} />
                  Database Setup
                </h3>
                <p className="login-subtitle">Configure Server Connection</p>
              </div>

              <p className="text-muted text-center small mb-4">Could not connect to the database. Please configure your Postgres server settings.</p>

              {dbSetupError && <Alert variant="danger" className="small-alert text-center py-2 mb-3">{dbSetupError}</Alert>}

              <Form onSubmit={handleDbSetupSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold" style={{ color: '#113b2e' }}>Database Server Host IP</Form.Label>
                  <div className="input-group-custom">
                    <span className="input-icon" style={{ height: '100%', top: 0, display: 'flex', alignItems: 'center', color: '#113b2e' }}><ServerIcon size={16} /></span>
                    <Form.Control type="text" name="host" value={dbConfig.host} onChange={handleDbConfigChange} required className="login-input" />
                  </div>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold" style={{ color: '#113b2e' }}>Port</Form.Label>
                  <div className="input-group-custom">
                    <span className="input-icon" style={{ height: '100%', top: 0, display: 'flex', alignItems: 'center', color: '#113b2e' }}><PortIcon size={16} /></span>
                    <Form.Control type="text" name="port" value={dbConfig.port} onChange={handleDbConfigChange} required className="login-input" />
                  </div>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold" style={{ color: '#113b2e' }}>Database Name</Form.Label>
                  <div className="input-group-custom">
                    <span className="input-icon" style={{ height: '100%', top: 0, display: 'flex', alignItems: 'center', color: '#113b2e' }}><DatabaseIcon size={16} /></span>
                    <Form.Control type="text" name="name" value={dbConfig.name} onChange={handleDbConfigChange} required className="login-input" />
                  </div>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold" style={{ color: '#113b2e' }}>Username</Form.Label>
                  <div className="input-group-custom">
                    <span className="input-icon" style={{ height: '100%', top: 0, display: 'flex', alignItems: 'center', color: '#113b2e' }}><UserIcon size={16} /></span>
                    <Form.Control type="text" name="user" value={dbConfig.user} onChange={handleDbConfigChange} required className="login-input" />
                  </div>
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label className="small fw-semibold" style={{ color: '#113b2e' }}>Password</Form.Label>
                  <div className="input-group-custom">
                    <span className="input-icon" style={{ height: '100%', top: 0, display: 'flex', alignItems: 'center', color: '#113b2e' }}><KeyIcon size={16} /></span>
                    <Form.Control type="password" name="password" value={dbConfig.password} onChange={handleDbConfigChange} required className="login-input" style={{ paddingRight: 40 }} />
                  </div>
                </Form.Group>
                <Button type="submit" className="w-100 py-2 btn-login" disabled={dbSetupSaving}>
                  {dbSetupSaving ? <Spinner animation="border" size="sm" className="me-2" /> : <><SettingsIcon size={16} className="me-2" />Connect & Save</>}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <LoginScreen shopName={shopName} onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <>
      <nav className="app-navbar">
        <a className="navbar-brand" >
          <img src={logo} alt="Logo" style={{ width: 28, height: 28, marginRight: 8, objectFit: 'contain' }} />
          {shopName}
        </a>
        <div className="navbar-actions">
          <div className="navbar-search">
             <span className="search-icon"><SearchIcon size={16} /></span>
            <input id="global-search" type="text" placeholder="Search anything..." />
          </div>

          <Dropdown align="end" className="d-inline">
            <Dropdown.Toggle as="button" className="nav-icon-btn" id="theme-dropdown" title="Change Theme">
              {theme === 'light' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            </Dropdown.Toggle>
            <Dropdown.Menu className={theme === 'dark' ? 'dropdown-menu-dark' : 'dropdown-menu-light shadow'}>
              <Dropdown.Item onClick={() => setTheme('light')}>
                <SunIcon size={16} /> Light Theme
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setTheme('dark')}>
                <MoonIcon size={16} /> Dark Theme
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>

          <button className="nav-icon-btn" id="btn-notifications" title="Notifications">
            <BellIcon size={18} />
            <span className="badge-dot" />
          </button>
          {currentUser && (
            <div className="user-profile-nav">
              <div className="user-avatar" title={`${currentUser.fullName} (${currentUser.role})`}>
                {currentUser.fullName ? currentUser.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'US'}
              </div>
              <div className="user-info-dropdown">
                <span className="user-nav-name">{currentUser.fullName}</span>
                <span className="user-nav-role">{currentUser.role}</span>
              </div>
              <button className="btn-logout" onClick={handleLogout} title="Log Out" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LogoutIcon size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="app-body">
        <aside className="app-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-section-title">Navigation</div>
            <ul className="sidebar-nav">
              {navItems.map((item) => (
                <li className="sidebar-nav-item" key={item.page}>
                  <a className={`sidebar-nav-link ${currentPage === item.page ? 'active' : ''}`} href="#"
                    onClick={(e) => { e.preventDefault(); handleNav(item.page) }}>
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                    {item.page === 'applications' && stats.total > 0 && <span className="nav-badge">{stats.total}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="sidebar-footer">
            <div className="sidebar-footer-info">
              <span className="status-dot" />
              <span className="status-text"><strong>System Online</strong>{shopName}</span>
            </div>
          </div>
        </aside>

        <main className="app-main">{renderContent()}</main>
      </div>

      {/* ─── New Application Modal (Tabbed) ─── */}
      <Modal show={showModal} onHide={handleCloseModal} centered size="lg" contentClassName="modal-dark">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title>{editingApplicationId ? 'Edit Application' : 'New Application'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body style={{ padding: '20px 24px' }}>
            {!editingApplicationId && (
              <div className="d-flex flex-column gap-2 mb-4" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <div className="d-flex gap-2 w-100">
                  <button
                    type="button"
                    className={modalTab === 'individual' ? 'btn-primary-glow' : 'btn-outline-subtle'}
                    onClick={() => handleTabSwitch('individual')}
                    style={{ flex: 1, justifyContent: 'center', border: modalTab === 'individual' ? 'none' : '1px solid var(--border-color)' }}
                  >
                    Individual Application
                  </button>
                  <button
                    type="button"
                    className={modalTab === 'company' ? 'btn-primary-glow' : 'btn-outline-subtle'}
                    onClick={() => handleTabSwitch('company')}
                    style={{ flex: 1, justifyContent: 'center', border: modalTab === 'company' ? 'none' : '1px solid var(--border-color)' }}
                  >
                    Company Application
                  </button>
                  <button
                    type="button"
                    className={modalTab === 'advance' ? 'btn-primary-glow' : 'btn-outline-subtle'}
                    onClick={() => handleTabSwitch('advance')}
                    style={{ flex: 1, justifyContent: 'center', border: modalTab === 'advance' ? 'none' : '1px solid var(--border-color)' }}
                  >
                    Receive Advance
                  </button>
                </div>
                <div className="d-flex gap-2 w-100">
                  <button
                    type="button"
                    className={modalTab === 'travels' ? 'btn-primary-glow' : 'btn-outline-subtle'}
                    onClick={() => handleTabSwitch('travels')}
                    style={{ flex: 0.333, justifyContent: 'center', border: modalTab === 'travels' ? 'none' : '1px solid var(--border-color)' }}
                  >
                    Travels Application
                  </button>
                  <div style={{ flex: 0.667 }} />
                </div>
              </div>
            )}

            {formError && (
              <Alert variant="danger" className="py-2 px-3 mb-3 border-0 rounded-3 text-white" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                <strong>Error:</strong> {formError}
              </Alert>
            )}

            {modalTab === 'advance' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                {/* Advance Type Selector (Company / Individual) */}
                <Form.Group className="mb-2">
                  <Form.Label className="modal-field-label">Deposit For</Form.Label>
                  <div style={{ display: 'flex', gap: 24 }}>
                    <Form.Check
                      type="radio"
                      id="advance-type-company"
                      label="Company"
                      name="advanceType"
                      checked={advanceType === 'company'}
                      onChange={() => { setAdvanceType('company'); setFormData(emptyForm); }}
                      style={{ color: 'var(--text-primary)', cursor: 'pointer' }}
                    />
                    <Form.Check
                      type="radio"
                      id="advance-type-individual"
                      label="Individual Client"
                      name="advanceType"
                      checked={advanceType === 'individual'}
                      onChange={() => { setAdvanceType('individual'); setFormData(emptyForm); }}
                      style={{ color: 'var(--text-primary)', cursor: 'pointer' }}
                    />
                  </div>
                </Form.Group>

                <div style={{ display: 'grid', gridTemplateColumns: '1.0fr 1.0fr', gap: 20, alignItems: 'start' }}>
                  {/* Left Column: Client Selection */}
                  <div>
                    {advanceType === 'company' ? (
                      <Form.Group className="mb-3">
                        <Form.Label className="modal-field-label">Company <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                        <Form.Select
                          name="companyId"
                          value={formData.companyId}
                          onChange={handleInputChange}
                        >
                          <option value="">Select a company...</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </Form.Select>
                        {(() => {
                          const matchedComp = companies.find(c => String(c.id) === formData.companyId)
                          if (matchedComp) {
                            return (
                              <div className="mt-2 text-success fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.85rem' }}>
                                <SalesIcon size={14} /> Current Advance: AED {(matchedComp.advanceBalance || 0).toFixed(2)}
                              </div>
                            )
                          }
                          return null
                        })()}
                      </Form.Group>
                    ) : (
                      <>
                        <Form.Group className="mb-3">
                          <Form.Label className="modal-field-label">Customer Name <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                          <Form.Control
                            type="text"
                            name="customerName"
                            placeholder="Full name"
                            value={formData.customerName}
                            onChange={handleInputChange}
                            autoFocus
                          />
                          {(() => {
                            const matchedInd = individuals.find(ind => ind.name.toLowerCase().trim() === formData.customerName.toLowerCase().trim())
                            if (matchedInd) {
                              return (
                                <div className="mt-2 text-success fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.85rem' }}>
                                  <SalesIcon size={14} /> Current Advance: AED {(matchedInd.advanceBalance || 0).toFixed(2)}
                                </div>
                              )
                            }
                            return null
                          })()}
                        </Form.Group>
                        <Form.Group className="mb-3">
                          <Form.Label className="modal-field-label">Phone <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                          <Form.Control
                            type="tel"
                            name="phone"
                            placeholder="05X XXX XXXX"
                            value={formData.phone}
                            onChange={handleInputChange}
                          />
                        </Form.Group>
                      </>
                    )}
                  </div>

                  {/* Right Column: Deposit Details */}
                  <div>
                    <Form.Group className="mb-3">
                      <Form.Label className="modal-field-label">Advance Amount Received (AED) <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0.01"
                        name="paidAmount"
                        placeholder="0.00"
                        value={formData.paidAmount}
                        onChange={handleInputChange}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="modal-field-label">Payment Method <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                      <Form.Select
                        name="customerPayment"
                        value={formData.customerPayment}
                        onChange={handleInputChange}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Account Transfer">Account Transfer</option>
                      </Form.Select>
                    </Form.Group>
                  </div>
                </div>
              </div>
            ) : modalTab === 'travels' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1.0fr 1.3fr', gap: 20, alignItems: 'start' }}>
                {/* Left Column: Client & Service Details */}
                <div>
                  {/* Travel Supplier Dropdown */}
                  <Form.Group className="mb-3">
                    <Form.Label className="modal-field-label">Travel Supplier / Entity <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Form.Select
                        name="govtEntity"
                        value={formData.govtEntity}
                        onChange={handleInputChange}
                        style={{ flex: 1 }}
                      >
                        <option value="">Select Travel Supplier...</option>
                        {travelSuppliers.map((sup) => (
                          <option key={sup.id} value={sup.name}>{sup.name}</option>
                        ))}
                      </Form.Select>
                      <button
                        type="button"
                        className="btn-outline-subtle d-flex align-items-center justify-content-center"
                        style={{ whiteSpace: 'nowrap', padding: '6px 14px' }}
                        onClick={() => {
                          setShowAddTravelSupplier(!showAddTravelSupplier)
                        }}
                      >
                        {showAddTravelSupplier ? <CloseIcon size={12} /> : <PlusIcon size={12} />}
                      </button>
                    </div>
                  </Form.Group>

                  {showAddTravelSupplier && (
                    <div className="modal-inline-add mb-3" style={{ display: 'flex', gap: 8 }}>
                      <Form.Control
                        type="text"
                        placeholder="New travel supplier name"
                        value={newTravelSupplierName}
                        onChange={(e) => setNewTravelSupplierName(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn-primary-glow"
                        style={{ padding: '6px 16px', border: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                        disabled={addingTravelSupplier || !newTravelSupplierName.trim()}
                        onClick={handleAddTravelSupplierInline}
                      >
                        {addingTravelSupplier ? <Spinner animation="border" size="sm" /> : <><SaveIcon size={12} /> Save</>}
                      </button>
                    </div>
                  )}

                  {/* Traveler Category radio buttons */}
                  <Form.Group className="mb-3">
                    <Form.Label className="modal-field-label">Traveler Category</Form.Label>
                    <div style={{ display: 'flex', gap: 24 }}>
                      <Form.Check
                        type="radio"
                        id="travel-client-individual"
                        label="Individual Client"
                        name="travelClientType"
                        checked={travelClientType === 'individual'}
                        onChange={() => handleTravelClientTypeChange('individual')}
                        style={{ color: 'var(--text-primary)', cursor: 'pointer' }}
                      />
                      <Form.Check
                        type="radio"
                        id="travel-client-company"
                        label="Company Client"
                        name="travelClientType"
                        checked={travelClientType === 'company'}
                        onChange={() => handleTravelClientTypeChange('company')}
                        style={{ color: 'var(--text-primary)', cursor: 'pointer' }}
                      />
                    </div>
                  </Form.Group>

                  {/* Individual fields */}
                  {travelClientType === 'individual' ? (
                    <>
                      <Form.Group className="mb-3">
                        <Form.Label className="modal-field-label">Customer Name / Traveler <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                        <Form.Control
                          type="text"
                          name="customerName"
                          placeholder="Full name"
                          value={formData.customerName}
                          onChange={handleInputChange}
                        />
                        {(() => {
                          const matchedInd = individuals.find(ind => ind.name.toLowerCase().trim() === formData.customerName.toLowerCase().trim())
                          if (matchedInd) {
                            return (
                              <div className="mt-1 text-success fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.85rem' }}>
                                <SalesIcon size={14} /> Advance: AED {(matchedInd.advanceBalance || 0).toFixed(2)}
                              </div>
                            )
                          }
                          return null
                        })()}
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label className="modal-field-label">Phone <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(optional)</span></Form.Label>
                        <Form.Control
                          type="tel"
                          name="phone"
                          placeholder="05X XXX XXXX"
                          value={formData.phone}
                          onChange={handleInputChange}
                        />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          id="travel-save-to-individual-dir-check"
                          label="Add this customer to the Individual Directory"
                          checked={saveToDirectory}
                          onChange={(e) => setSaveToDirectory(e.target.checked)}
                          style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                        />
                      </Form.Group>
                    </>
                  ) : (
                    <>
                      {/* Company fields */}
                      <Form.Group className="mb-3">
                        <Form.Label className="modal-field-label">Company <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Form.Select
                            name="companyId"
                            value={formData.companyId}
                            onChange={handleInputChange}
                            style={{ flex: 1 }}
                          >
                            <option value="">Select a company...</option>
                            {companies.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </Form.Select>
                          <button
                            type="button"
                            className="btn-outline-subtle d-flex align-items-center justify-content-center"
                            style={{ whiteSpace: 'nowrap', padding: '6px 14px' }}
                            onClick={() => {
                              setShowAddCompany(!showAddCompany)
                              setShowAddCategory(false)
                              setShowAddService(false)
                            }}
                          >
                            {showAddCompany ? <CloseIcon size={12} /> : <PlusIcon size={12} />}
                          </button>
                        </div>
                        {(() => {
                          const matchedComp = companies.find(c => String(c.id) === formData.companyId)
                          if (matchedComp) {
                            return (
                              <div className="mt-1 text-success fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.85rem' }}>
                                <SalesIcon size={14} /> Advance: AED {(matchedComp.advanceBalance || 0).toFixed(2)}
                              </div>
                            )
                          }
                          return null
                        })()}
                      </Form.Group>

                      {showAddCompany && (
                        <div className="modal-inline-add mb-3">
                          <Form.Control
                            type="text"
                            placeholder="New company name"
                            value={newCompanyName}
                            onChange={(e) => setNewCompanyName(e.target.value)}
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            className="btn-primary-glow"
                            style={{ padding: '6px 16px', border: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                            disabled={addingCompany || !newCompanyName.trim()}
                            onClick={handleAddCompany}
                          >
                            {addingCompany ? <Spinner animation="border" size="sm" /> : <><SaveIcon size={12} /> Save</>}
                          </button>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Form.Group className="mb-3">
                          <Form.Label className="modal-field-label">Traveller Name <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                          <Form.Control
                            type="text"
                            name="customerName"
                            placeholder="Name"
                            value={formData.customerName}
                            onChange={handleInputChange}
                          />
                        </Form.Group>
                        <Form.Group className="mb-3">
                          <Form.Label className="modal-field-label">Phone <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(optional)</span></Form.Label>
                          <Form.Control
                            type="tel"
                            name="phone"
                            placeholder="05X XXX XXXX"
                            value={formData.phone}
                            onChange={handleInputChange}
                          />
                        </Form.Group>
                      </div>
                    </>
                  )}

                  {/* Service and Category Selection */}
                  {renderCategoryAndServiceSection()}
                </div>

                {/* Right Column: Payment Details */}
                <div>
                  {renderPaymentSection()}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1.0fr 1.3fr', gap: 20, alignItems: 'start' }}>
                {/* Left Column: Client & Service Details */}
                <div>
                  {modalTab === 'individual' ? (
                    <>
                      <Form.Group className="mb-3">
                        <Form.Label className="modal-field-label">Customer Name <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                        <Form.Control type="text" name="customerName" placeholder="Full name" value={formData.customerName} onChange={handleInputChange} autoFocus />
                        {(() => {
                          const matchedInd = individuals.find(ind => ind.name.toLowerCase().trim() === formData.customerName.toLowerCase().trim())
                          if (matchedInd) {
                            return (
                              <div className="mt-1 text-success fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.85rem' }}>
                                <SalesIcon size={14} /> Advance: AED {(matchedInd.advanceBalance || 0).toFixed(2)}
                              </div>
                            )
                          }
                          return null
                        })()}
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label className="modal-field-label">Phone <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(optional)</span></Form.Label>
                        <Form.Control type="tel" name="phone" placeholder="05X XXX XXXX" value={formData.phone} onChange={handleInputChange} />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          id="save-to-individual-dir-check"
                          label="Add this customer to the Individual Directory"
                          checked={saveToDirectory}
                          onChange={(e) => setSaveToDirectory(e.target.checked)}
                          style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                        />
                      </Form.Group>
                    </>
                  ) : (
                    <>
                      <Form.Group className="mb-3">
                        <Form.Label className="modal-field-label">Company <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Form.Select name="companyId" value={formData.companyId} onChange={handleInputChange} style={{ flex: 1 }}>
                            <option value="">Select a company...</option>
                            {companies.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </Form.Select>
                          <button type="button" className="btn-outline-subtle d-flex align-items-center justify-content-center" style={{ whiteSpace: 'nowrap', padding: '6px 14px' }}
                            onClick={() => {
                              setShowAddCompany(!showAddCompany)
                              setShowAddCategory(false)
                              setShowAddService(false)
                            }}>
                            {showAddCompany ? <CloseIcon size={12} /> : <PlusIcon size={12} />}
                          </button>
                        </div>
                        {(() => {
                          const matchedComp = companies.find(c => String(c.id) === formData.companyId)
                          if (matchedComp) {
                            return (
                              <div className="mt-1 text-success fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.85rem' }}>
                                <SalesIcon size={14} /> Advance: AED {(matchedComp.advanceBalance || 0).toFixed(2)}
                              </div>
                            )
                          }
                          return null
                        })()}
                      </Form.Group>

                      {showAddCompany && (
                        <div className="modal-inline-add mb-3">
                          <Form.Control
                            type="text"
                            placeholder="New company name"
                            value={newCompanyName}
                            onChange={(e) => setNewCompanyName(e.target.value)}
                            style={{ flex: 1 }}
                          />
                          <button type="button" className="btn-primary-glow" style={{ padding: '6px 16px', border: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                            disabled={addingCompany || !newCompanyName.trim()} onClick={handleAddCompany}>
                            {addingCompany ? <Spinner animation="border" size="sm" /> : <><SaveIcon size={12} /> Save</>}
                          </button>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Form.Group className="mb-3">
                          <Form.Label className="modal-field-label">Contact Person <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                          <Form.Control type="text" name="customerName" placeholder="Name" value={formData.customerName} onChange={handleInputChange} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                          <Form.Label className="modal-field-label">Phone <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(optional)</span></Form.Label>
                          <Form.Control type="tel" name="phone" placeholder="05X XXX XXXX" value={formData.phone} onChange={handleInputChange} />
                        </Form.Group>
                      </div>
                    </>
                  )}

                  {renderCategoryAndServiceSection()}
                </div>

                {/* Right Column: Payment Details */}
                <div>
                  {renderPaymentSection()}
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={handleCloseModal} disabled={saving}>Cancel</Button>
            <Button type="submit" className="btn-primary-glow" disabled={saving || (modalTab !== 'advance' && services.length === 0)} style={{ border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              {saving ? <><Spinner animation="border" size="sm" className="me-2" />Saving...</> : <><SaveIcon size={14} /> Save</>}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ─── First-Time Setup Modal ─── */}
      <Modal show={showSetup} centered backdrop="static" keyboard={false} contentClassName="modal-dark">
        <Modal.Header><Modal.Title>Welcome — Shop Setup</Modal.Title></Modal.Header>
        <Form onSubmit={handleSetupSubmit}>
          <Modal.Body>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20 }}>Set up your typing center. This is a one-time setup.</p>
            <Form.Group className="mb-3"><Form.Label>Shop Name <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
              <Form.Control type="text" placeholder="e.g. Abu Dhabi Typing Center" value={setupName} onChange={(e) => setSetupName(e.target.value)} autoFocus /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Address</Form.Label>
              <Form.Control type="text" placeholder="e.g. Mussafah, Abu Dhabi" value={setupAddress} onChange={(e) => setSetupAddress(e.target.value)} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Phone</Form.Label>
              <Form.Control type="tel" placeholder="02 XXX XXXX" value={setupPhone} onChange={(e) => setSetupPhone(e.target.value)} /></Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button type="submit" className="btn-primary-glow" disabled={setupSaving || !setupName.trim()} style={{ border: 'none' }}>
              {setupSaving ? <><Spinner animation="border" size="sm" className="me-2" />Saving...</> : 'Start Using'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}

export default App
