import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { AllCommunityModule, themeAlpine } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { Modal, Button, Form, Spinner, Alert, Dropdown } from 'react-bootstrap'
import HomeDashboard from './HomeDashboard'
import AdminSettings from './AdminSettings'
import DailyReport from './DailyReport'
import CardAccounts from './CardAccounts'
import LoginScreen from './LoginScreen'
import CompanyManagement from './CompanyManagement'
import IndividualManagement from './IndividualManagement'
import ExpensesManagement from './ExpensesManagement'
import MonthlyReport from './MonthlyReport'
import logo from '../../logo.png'
import fcLogo from '../../FC LOGO NEW.png'
import wallpaper from '../../Wallpaper.png'
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
  BillIcon
} from './Icons'

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
  serviceCharge: '',
  customerPayment: 'Cash',
  govtFee: '',
  govtPayment: 'Cash',
  status: 'Pending',
  govtEntity: ''
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
  const [newServicePrice, setNewServicePrice] = useState('')
  const [newServiceCategoryId, setNewServiceCategoryId] = useState('')
  const [addingService, setAddingService] = useState(false)

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
  const [visibleCols, setVisibleCols] = useState({
    id: true,
    customerName: true,
    customerType: true,
    emiratesId: true,
    service: true,
    serviceCharge: true,
    govtFee: true,
    typingFee: true,
    customerPayment: true,
    createdBy: true,
    createdAt: true,
    status: true,
    govtEntity: true,
    actions: true
  })

  const getFriendlyColName = useCallback((col) => {
    switch (col) {
      case 'id': return 'ID'
      case 'customerName': return 'Customer Name'
      case 'customerType': return 'Customer Type'
      case 'emiratesId': return 'Company / EID'
      case 'service': return 'Service'
      case 'serviceCharge': return 'Received'
      case 'govtFee': return 'Paid'
      case 'typingFee': return 'Profit'
      case 'customerPayment': return 'Payment Method'
      case 'createdBy': return 'Staff'
      case 'createdAt': return 'Date'
      case 'status': return 'Status'
      case 'govtEntity': return 'Govt Entity'
      case 'actions': return 'Actions'
      default: return col
    }
  }, [])

  const handleToggleColumn = useCallback((col) => {
    setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))
  }, [])

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

  const verifyDatabaseConnection = useCallback(async () => {
    try {
      setCheckingDb(true)
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
  }, [loadShopConfig, loadApplications, loadCategories, loadIndividuals, loadServices, loadPaymentCards, loadCompanies])

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

  const shopName = shopConfig?.shopName || 'First Choice'

  // ── Computed typing fee ──
  const typingFee = useMemo(() => {
    const svc = services.find(s => s.id === parseInt(formData.serviceId, 10))
    if (svc && svc.name === 'Advance Deposit') {
      return 0
    }
    const charge = parseFloat(formData.serviceCharge) || 0
    const govt = formData.govtPayment === 'N/A' ? 0 : (parseFloat(formData.govtFee) || 0)
    return Math.max(0, charge - govt)
  }, [formData.serviceCharge, formData.govtFee, formData.govtPayment, formData.serviceId, services])

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
          updated.serviceCharge = String(svc.price)
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
          }
        }
      }
      if (name === 'govtPayment' && value === 'N/A') {
        updated.govtFee = '0'
      }
      return updated
    })
  }, [services])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.customerName.trim() || !formData.serviceId) {
      setFormError('Customer name and service are required.')
      return
    }

    if (modalTab === 'company' && !formData.companyId) {
      setFormError('Please select a company.')
      return
    }

    // Resolve company name for storage
    let companyName = ''
    if (modalTab === 'company' && formData.companyId) {
      const comp = companiesRef.current.find(c => c.id === parseInt(formData.companyId, 10))
      companyName = comp ? comp.name : ''
    }

    try {
      setSaving(true)
      const charge = parseFloat(formData.serviceCharge) || 0
      const govt = formData.govtPayment === 'N/A' ? 0 : (parseFloat(formData.govtFee) || 0)
      const entity = formData.govtPayment === 'N/A' ? '' : (formData.govtEntity || '').trim()
      let result
      if (editingApplicationId) {
        result = await window.api.updateApplication({
          id: editingApplicationId,
          customerName: formData.customerName.trim(),
          phone: formData.phone.trim(),
          emiratesId: modalTab === 'company' ? companyName : formData.emiratesId.trim(),
          customerType: modalTab === 'company' ? 'Company' : 'Individual',
          serviceId: parseInt(formData.serviceId, 10),
          serviceCharge: charge,
          customerPayment: formData.customerPayment,
          govtFee: govt,
          govtPayment: formData.govtPayment,
          govtEntity: entity,
          typingFee: Math.max(0, charge - govt),
          status: formData.status || 'Pending'
        })
      } else {
        result = await window.api.createApplication({
          customerName: formData.customerName.trim(),
          phone: formData.phone.trim(),
          emiratesId: modalTab === 'company' ? companyName : formData.emiratesId.trim(),
          customerType: modalTab === 'company' ? 'Company' : 'Individual',
          serviceId: parseInt(formData.serviceId, 10),
          serviceCharge: charge,
          customerPayment: formData.customerPayment,
          govtFee: govt,
          govtPayment: formData.govtPayment,
          govtEntity: entity,
          typingFee: Math.max(0, charge - govt),
          status: 'Pending',
          createdBy: currentUser?.username || ''
        })
      }
      if (result.success) {
        if (modalTab === 'individual' && saveToDirectory) {
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
      } else { setFormError(result.error) }
    } catch (err) { setFormError(err.message) }
    finally { setSaving(false) }
  }, [formData, modalTab, companies, loadApplications, editingApplicationId, currentUser, saveToDirectory])

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
    setNewServicePrice('')
    setNewServiceCategoryId('')
  }, [])

  const handleEditApplicationClick = useCallback((appData) => {
    loadCategories()
    loadIndividuals()
    loadServices()
    loadPaymentCards()
    loadCompanies()

    setEditingApplicationId(appData.id)

    const isCompany = appData.customerType === 'Company'
    setModalTab(isCompany ? 'company' : 'individual')

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
      customerPayment: appData.customerPayment || 'Cash',
      govtFee: String(appData.govtFee),
      govtPayment: appData.govtPayment || 'Cash',
      govtEntity: appData.govtEntity || '',
      status: appData.status || 'Pending'
    })
    setSaveToDirectory(false)

    setShowModal(true)
  }, [loadCategories, loadIndividuals, loadServices, loadPaymentCards, loadCompanies])

  const handleDeleteApplicationClick = useCallback(async (appData) => {
    if (!window.confirm(`Are you sure you want to delete the application for "${appData.customerName}"?`)) return
    try {
      setLoading(true)
      const res = await window.api.deleteApplication({ id: appData.id })
      if (res.success) {
        await loadApplications()
      } else {
        setError(res.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [loadApplications])

  const handleOpenModal = useCallback(async () => {
    setShowModal(true)
    setModalTab('individual')
    setFormData(emptyForm)
    setSaveToDirectory(false)
    setSelectedCategoryId('')
    await loadCategories()
    await loadIndividuals()
    await loadServices()
    await loadPaymentCards()
    await loadCompanies()
  }, [loadCategories, loadIndividuals, loadServices, loadPaymentCards, loadCompanies])

  // ── Tab switch ──
  const handleTabSwitch = useCallback((tab) => {
    setModalTab(tab)
    setFormData(emptyForm)
    setFormError(null)
    setShowAddCompany(false)
    setNewCompanyName('')
  }, [])

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
      const result = await window.api.createCategory({ name: newCategoryName.trim() })
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
  }, [newCategoryName, loadCategories])

  // ── Add Service inline ──
  const handleAddServiceInline = useCallback(async () => {
    if (!newServiceName.trim()) return
    const catId = newServiceCategoryId || selectedCategoryId
    if (!catId) {
      setFormError('Please select or specify a category for the new service.')
      return
    }
    const priceVal = parseFloat(newServicePrice) || 0
    try {
      setAddingService(true)
      const result = await window.api.createService({
        name: newServiceName.trim(),
        price: priceVal,
        categoryId: parseInt(catId, 10)
      })
      if (result.success) {
        await loadServices()
        setFormData(prev => ({
          ...prev,
          serviceId: String(result.data.id),
          serviceCharge: String(priceVal)
        }))
        setNewServiceName('')
        setNewServicePrice('')
        setNewServiceCategoryId('')
        setShowAddService(false)
      } else {
        setFormError(result.error)
      }
    } catch (err) { setFormError(err.message) }
    finally { setAddingService(false) }
  }, [newServiceName, newServicePrice, newServiceCategoryId, selectedCategoryId, loadServices])

  const filteredApplications = useMemo(() => {
    if (gridFilter === 'credit') {
      return applications.filter(a => a.customerPayment === 'Credit' && a.status !== 'Completed' && a.status !== 'Rejected')
    }
    if (gridFilter === 'pending-govt') {
      return applications.filter(a => (a.status === 'Pending' || a.status === 'In Progress') && a.govtPayment !== 'N/A')
    }
    return applications
  }, [applications, gridFilter])

  // ── Grid columns ──
  const columnDefs = useMemo(() => [
    { headerName: 'ID', field: 'id', width: 70, sortable: true, filter: true, hide: !visibleCols.id },
    { headerName: 'Customer', field: 'customerName', flex: 1.3, minWidth: 150, sortable: true, filter: true, hide: !visibleCols.customerName },
    { headerName: 'Type', field: 'customerType', width: 110, sortable: true, filter: true, cellRenderer: CustomerTypeRenderer, hide: !visibleCols.customerType },
    { headerName: 'Company / EID', field: 'emiratesId', flex: 1, minWidth: 130, sortable: true, filter: true, hide: !visibleCols.emiratesId },
    { headerName: 'Service', field: 'service', flex: 1, minWidth: 140, sortable: true, filter: true, valueGetter: (p) => p.data?.service?.name || '—', hide: !visibleCols.service },
    { headerName: 'Received', field: 'serviceCharge', width: 100, sortable: true, valueFormatter: (p) => p.value?.toFixed(2), hide: !visibleCols.serviceCharge },
    { headerName: 'Paid', field: 'govtFee', width: 100, sortable: true, valueFormatter: (p) => p.value?.toFixed(2), hide: !visibleCols.govtFee },
    { headerName: 'Paid To Entity', field: 'govtEntity', width: 120, sortable: true, filter: true, hide: !visibleCols.govtEntity },
    { headerName: 'Profit', field: 'typingFee', width: 90, sortable: true, valueFormatter: (p) => p.value?.toFixed(2), cellStyle: { color: '#34d399' }, hide: !visibleCols.typingFee },
    { headerName: 'Paid By', field: 'customerPayment', width: 110, sortable: true, filter: true, hide: !visibleCols.customerPayment },
    { headerName: 'Staff', field: 'createdBy', width: 100, sortable: true, filter: true, hide: !visibleCols.createdBy },
    { headerName: 'Date', field: 'createdAt', width: 120, sortable: true, cellRenderer: DateRenderer, hide: !visibleCols.createdAt },
    { headerName: 'Status', field: 'status', width: 120, sortable: true, filter: true, cellRenderer: StatusRenderer, hide: !visibleCols.status },
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
      },
      hide: !visibleCols.actions
    }
  ], [handleEditApplicationClick, handleDeleteApplicationClick, visibleCols])

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
      { icon: <CardIcon size={18} />, label: 'Card Accounts', page: 'card-accounts' },
      { icon: <BillIcon size={18} />, label: 'Expenses / Accounts', page: 'expenses' }
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
          shopName={shopName}
          onNavigate={handleDashboardNavigate}
          onOpenFolder={handleDashboardOpenFolder}
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
    if (currentPage === 'card-accounts') return <CardAccounts />
    if (currentPage === 'expenses') return <ExpensesManagement />
    if (currentPage === 'company') {
      return (
        <CompanyManagement
          initialCompanyId={appCompanyId}
          onClearInitialId={() => setAppCompanyId(null)}
        />
      )
    }
    if (currentPage === 'individual') {
      return (
        <IndividualManagement
          initialIndividualId={appIndividualId}
          onClearInitialId={() => setAppIndividualId(null)}
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
          <div className="page-header-actions">
            <button className="btn-outline-subtle" id="btn-export" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ExportIcon size={14} /> Export
            </button>
            <button className="btn-primary-glow" id="btn-new-application" onClick={handleOpenModal} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
              <ReportIcon size={14} className="me-1 align-middle text-info" /> Showing <strong>{gridFilter === 'credit' ? 'Outstanding Customer Credits (To Receive)' : 'Pending Government Payouts (To be Paid Out)'}</strong> entries from Dashboard.
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
            <div className="grid-toolbar-right">
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
              />
            )}
          </div>
        </div>
      </>
    )
  }

  // ── Category and Service selection (shared between tabs) ──
  const renderCategoryAndServiceSection = () => {
    const filteredServices = selectedCategoryId
      ? services.filter((s) => s.categoryId === parseInt(selectedCategoryId, 10))
      : services

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
              {categories.map((cat) => (
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
                  {svc.name} — AED {svc.price.toFixed(2)} ({svc.category?.name})
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
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              placeholder="Price (AED)"
              value={newServicePrice}
              onChange={(e) => setNewServicePrice(e.target.value)}
              style={{ flex: '1 1 80px' }}
            />
            <Form.Select
              value={newServiceCategoryId || selectedCategoryId}
              onChange={(e) => setNewServiceCategoryId(e.target.value)}
              style={{ flex: '1 1 120px' }}
            >
              <option value="">Category...</option>
              {categories.map((cat) => (
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

    return (
      <div className="modal-payment-section">
        <div className="modal-section-title"><SalesIcon size={18} className="me-2" />Payment Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Form.Group>
            <Form.Label className="modal-field-label">Received (AED)</Form.Label>
            <Form.Control type="number" step="0.01" min="0" name="serviceCharge" placeholder="0.00" value={formData.serviceCharge} onChange={handleInputChange} />
          </Form.Group>
          <Form.Group>
            <Form.Label className="modal-field-label">Paid (AED)</Form.Label>
            <Form.Control type="number" step="0.01" min="0" name="govtFee" placeholder="0.00" value={isDeposit ? '0' : formData.govtFee} onChange={handleInputChange} disabled={formData.govtPayment === 'N/A' || isDeposit} />
          </Form.Group>
          <Form.Group>
            <Form.Label className="modal-field-label">Typing Fee</Form.Label>
            <Form.Control type="text" readOnly value={`AED ${typingFee.toFixed(2)}`} style={{ color: 'var(--success)', fontWeight: 600 }} />
          </Form.Group>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <Form.Group>
            <Form.Label className="modal-field-label">Received</Form.Label>
            <Form.Select name="customerPayment" value={formData.customerPayment} onChange={handleInputChange}>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Cheque">Cheque</option>
              <option value="Account Transfer">Account Transfer</option>
              <option value="Credit">Credit</option>
              {!isDeposit && <option value="Advance">Advance</option>}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label className="modal-field-label">Paid To</Form.Label>
            <Form.Select name="govtPayment" value={isDeposit ? 'N/A' : formData.govtPayment} onChange={handleInputChange} disabled={isDeposit}>
              <option value="Cash">Cash</option>
              <option value="N/A">N/A (None)</option>
              {paymentCards.map((c) => (<option key={c.id} value={c.bankName}>{c.bankName}</option>))}
            </Form.Select>
          </Form.Group>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
          <Form.Group>
            <Form.Label className="modal-field-label">Govt Entity (e.g. MOHRE, ICA, Immigration)</Form.Label>
            <Form.Control
              type="text"
              name="govtEntity"
              placeholder="e.g. MOHRE, ICA, Immigration"
              value={isDeposit ? '' : (formData.govtEntity || '')}
              onChange={handleInputChange}
              disabled={formData.govtPayment === 'N/A' || isDeposit}
            />
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

  if (checkingDb) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0f17', color: '#fff' }}>
        <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem', marginBottom: 20 }} />
        <h5>Connecting to Database...</h5>
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
          window.location.reload()
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
      <div className="login-container" style={{ backgroundImage: `url(${wallpaper})`, backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: 'cover' }}>
        <div className="login-box" style={{ maxWidth: 430 }}>
          <Card className="login-card shadow-lg">
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
                  <Form.Label className="small fw-semibold" style={{ color: '#475569' }}>Database Server Host IP</Form.Label>
                  <Form.Control type="text" name="host" value={dbConfig.host} onChange={handleDbConfigChange} required className="login-input" />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold" style={{ color: '#475569' }}>Port</Form.Label>
                  <Form.Control type="text" name="port" value={dbConfig.port} onChange={handleDbConfigChange} required className="login-input" />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold" style={{ color: '#475569' }}>Database Name</Form.Label>
                  <Form.Control type="text" name="name" value={dbConfig.name} onChange={handleDbConfigChange} required className="login-input" />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold" style={{ color: '#475569' }}>Username</Form.Label>
                  <Form.Control type="text" name="user" value={dbConfig.user} onChange={handleDbConfigChange} required className="login-input" />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label className="small fw-semibold" style={{ color: '#475569' }}>Password</Form.Label>
                  <Form.Control type="password" name="password" value={dbConfig.password} onChange={handleDbConfigChange} required className="login-input" />
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
            <span className="search-icon">🔍</span>
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
          <Modal.Body>
            {/* Tab Switcher */}
            <div className="modal-tabs">
              <button type="button" className={`modal-tab ${modalTab === 'individual' ? 'active' : ''}`} onClick={() => handleTabSwitch('individual')}>
                Individual
              </button>
              <button type="button" className={`modal-tab ${modalTab === 'company' ? 'active' : ''}`} onClick={() => handleTabSwitch('company')}>
                Company
              </button>
            </div>

            {formError && <Alert variant="danger" className="mb-3" style={{ fontSize: '0.85rem' }}>{formError}</Alert>}

            {/* ── Individual Tab ── */}
            {modalTab === 'individual' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Form.Group className="mb-3">
                    <Form.Label>Customer Name <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                    <Form.Control type="text" name="customerName" placeholder="Full name" value={formData.customerName} onChange={handleInputChange} autoFocus />
                    {(() => {
                      const matchedInd = individuals.find(ind => ind.name.toLowerCase().trim() === formData.customerName.toLowerCase().trim())
                      if (matchedInd) {
                        return (
                          <div className="mt-1 text-success fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.85rem' }}>
                            <SalesIcon size={14} /> Advance Balance: AED {(matchedInd.advanceBalance || 0).toFixed(2)}
                          </div>
                        )
                      }
                      return null
                    })()}
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(optional)</span></Form.Label>
                    <Form.Control type="tel" name="phone" placeholder="05X XXX XXXX" value={formData.phone} onChange={handleInputChange} />
                  </Form.Group>
                </div>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    id="save-to-individual-dir-check"
                    label="Add this customer to the Individual Directory"
                    checked={saveToDirectory}
                    onChange={(e) => setSaveToDirectory(e.target.checked)}
                    style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}
                  />
                </Form.Group>
                {renderCategoryAndServiceSection()}
                {renderPaymentSection()}
              </>
            )}

            {/* ── Company Tab ── */}
            {modalTab === 'company' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Company <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Form.Select name="companyId" value={formData.companyId} onChange={handleInputChange} style={{ flex: 1 }}>
                      <option value="">Select a company...</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Form.Select>
                    <button type="button" className="btn-outline-subtle d-flex align-items-center justify-content-center" style={{ whiteSpace: 'nowrap', padding: '6px 14px' }}
                      onClick={() => setShowAddCompany(!showAddCompany)}>
                      {showAddCompany ? <CloseIcon size={12} /> : <PlusIcon size={12} />}
                    </button>
                  </div>
                  {(() => {
                    const matchedComp = companies.find(c => String(c.id) === formData.companyId)
                    if (matchedComp) {
                      return (
                        <div className="mt-1 text-success fw-bold d-flex align-items-center gap-1" style={{ fontSize: '0.85rem' }}>
                          <SalesIcon size={14} /> Advance Balance: AED {(matchedComp.advanceBalance || 0).toFixed(2)}
                        </div>
                      )
                    }
                    return null
                  })()}
                </Form.Group>

                {showAddCompany && (
                  <div className="modal-inline-add">
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Form.Group className="mb-3">
                    <Form.Label>Contact Person <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                    <Form.Control type="text" name="customerName" placeholder="Contact person name" value={formData.customerName} onChange={handleInputChange} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(optional)</span></Form.Label>
                    <Form.Control type="tel" name="phone" placeholder="05X XXX XXXX" value={formData.phone} onChange={handleInputChange} />
                  </Form.Group>
                </div>

                {renderCategoryAndServiceSection()}
                {renderPaymentSection()}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={handleCloseModal} disabled={saving}>Cancel</Button>
            <Button type="submit" className="btn-primary-glow" disabled={saving || services.length === 0} style={{ border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
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
