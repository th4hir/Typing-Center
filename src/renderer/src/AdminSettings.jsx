import { useState, useEffect, useCallback } from 'react'
import { Form, Button, Spinner, Alert, Table } from 'react-bootstrap'
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  CompanyIcon,
  FolderIcon,
  CardIcon,
  ApplicationIcon,
  SettingsIcon,
  SaveIcon,
  RefreshIcon,
  PlaneIcon
} from './Icons'

function AdminSettings({ shopConfig, onShopConfigSaved, currentUser }) {
  // ── Shop config state ──
  const [editShopName, setEditShopName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [shopSaving, setShopSaving] = useState(false)

  // ── Category state ──
  const [categories, setCategories] = useState([])
  const [categoryName, setCategoryName] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState(null)

  // ── Travels Category state ──
  const [travelCategoryName, setTravelCategoryName] = useState('')
  const [travelCategorySaving, setTravelCategorySaving] = useState(false)
  const [editingTravelCategoryId, setEditingTravelCategoryId] = useState(null)

  // ── Govt Entity state ──
  const [govtEntities, setGovtEntities] = useState([])
  const [govtEntityName, setGovtEntityName] = useState('')
  const [govtEntitySaving, setGovtEntitySaving] = useState(false)
  const [editingGovtEntityId, setEditingGovtEntityId] = useState(null)

  // ── Travel Supplier state ──
  const [travelSuppliers, setTravelSuppliers] = useState([])
  const [travelSupplierName, setTravelSupplierName] = useState('')
  const [travelSupplierSaving, setTravelSupplierSaving] = useState(false)
  const [editingTravelSupplierId, setEditingTravelSupplierId] = useState(null)

  // ── Service state ──
  const [services, setServices] = useState([])
  const [serviceName, setServiceName] = useState('')
  const [serviceCategoryId, setServiceCategoryId] = useState('')
  const [serviceSaving, setServiceSaving] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState(null)

  // ── Travels Service state ──
  const [travelServiceName, setTravelServiceName] = useState('')
  const [travelServiceCategoryId, setTravelServiceCategoryId] = useState('')
  const [travelServiceSaving, setTravelServiceSaving] = useState(false)
  const [editingTravelServiceId, setEditingTravelServiceId] = useState(null)

  // ── Payment card state ──
  const [paymentCards, setPaymentCards] = useState([])
  const [cardBankName, setCardBankName] = useState('')
  const [cardSaving, setCardSaving] = useState(false)
  const [editingCardId, setEditingCardId] = useState(null)

  // ── Staff user state ──
  const [users, setUsers] = useState([])
  const [staffUsername, setStaffUsername] = useState('')
  const [staffFullName, setStaffFullName] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [staffRole, setStaffRole] = useState('Staff')
  const [editingUserId, setEditingUserId] = useState(null)
  const [staffSaving, setStaffSaving] = useState(false)

  // ── Global state ──
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // ── Database Settings state ──
  const [dbHost, setDbHost] = useState('localhost')
  const [dbPort, setDbPort] = useState('5432')
  const [dbUser, setDbUser] = useState('postgres')
  const [dbPassword, setDbPassword] = useState('admin')
  const [dbName, setDbName] = useState('typing_center_db')
  const [dbTesting, setDbTesting] = useState(false)
  const [dbSaving, setDbSaving] = useState(false)

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
    } catch (e) {
      console.error('Failed to parse database URL:', e)
    }
    return { user: 'postgres', password: 'admin', host: 'localhost', port: '5432', name: 'typing_center_db' }
  }

  const buildDatabaseUrl = (user, password, host, port, name) => {
    return `postgresql://${user}:${password}@${host}:${port}/${name}`
  }

  const loadDbConfig = useCallback(async () => {
    try {
      const result = await window.api.getDbConfig()
      if (result.success && result.data && result.data.databaseUrl) {
        const parsed = parseDatabaseUrl(result.data.databaseUrl)
        setDbHost(parsed.host)
        setDbPort(parsed.port)
        setDbUser(parsed.user)
        setDbPassword(parsed.password)
        setDbName(parsed.name)
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  const handleTestConnection = async () => {
    setDbTesting(true)
    setError(null)
    setSuccessMsg(null)
    const testUrl = buildDatabaseUrl(dbUser, dbPassword, dbHost, dbPort, dbName)
    try {
      const res = await window.api.testDbConnection({ databaseUrl: testUrl })
      if (res.success) {
        setSuccessMsg('Successfully connected to the database!')
      } else {
        setError(`Connection failed: ${res.error}`)
      }
    } catch (err) {
      setError(`Connection failed: ${err.message}`)
    } finally {
      setDbTesting(false)
    }
  }

  const handleSaveDbConfig = async (e) => {
    e.preventDefault()
    setDbSaving(true)
    setError(null)
    setSuccessMsg(null)
    const newUrl = buildDatabaseUrl(dbUser, dbPassword, dbHost, dbPort, dbName)
    try {
      const testRes = await window.api.testDbConnection({ databaseUrl: newUrl })
      if (!testRes.success) {
        setError(`Cannot save: Connection test failed. Details: ${testRes.error}`)
        setDbSaving(false)
        return
      }

      const res = await window.api.saveDbConfig({ databaseUrl: newUrl })
      if (res.success) {
        setSuccessMsg('Database settings saved! Restart the application to connect to the new server.')
      } else {
        setError(res.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setDbSaving(false)
    }
  }

  const handleBackup = async () => {
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await window.api.backupDatabase()
      if (res.success) {
        if (res.cancelled) return
        setSuccessMsg(`Database backed up successfully to: ${res.filePath}`)
      } else {
        setError(`Backup failed: ${res.error}`)
      }
    } catch (err) {
      setError(`Backup failed: ${err.message}`)
    }
  }

  const handleRestore = async () => {
    if (!window.confirm("WARNING: This will permanently overwrite all current database tables. Make sure you have a backup of your current database first. Are you sure you want to proceed?")) {
      return
    }

    setError(null)
    setSuccessMsg(null)
    try {
      const res = await window.api.restoreDatabase()
      if (res.success) {
        if (res.cancelled) return
        setSuccessMsg('Database restored successfully! Reloading data...')
        await Promise.all([
          loadCategories(),
          loadServices(),
          loadPaymentCards(),
          loadUsers(),
          loadGovtEntities(),
          loadTravelSuppliers()
        ])
      } else {
        setError(`Restore failed: ${res.error}`)
      }
    } catch (err) {
      setError(`Restore failed: ${err.message}`)
    }
  }

  // ── Populate shop config ──
  useEffect(() => {
    if (shopConfig) {
      setEditShopName(shopConfig.shopName || '')
      setEditAddress(shopConfig.address || '')
      setEditPhone(shopConfig.phone || '')
    }
  }, [shopConfig])

  // ── Data loaders ──
  const loadCategories = useCallback(async () => {
    try {
      const result = await window.api.fetchCategories()
      if (result.success) setCategories(result.data)
    } catch (err) { setError(err.message) }
  }, [])

  const loadServices = useCallback(async () => {
    try {
      const result = await window.api.fetchServices()
      if (result.success) setServices(result.data)
    } catch (err) { setError(err.message) }
  }, [])

  const loadPaymentCards = useCallback(async () => {
    try {
      const result = await window.api.fetchPaymentCards()
      if (result.success) setPaymentCards(result.data)
    } catch (err) { setError(err.message) }
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      const result = await window.api.fetchUsers()
      if (result.success) setUsers(result.data)
    } catch (err) { setError(err.message) }
  }, [])

  const loadGovtEntities = useCallback(async () => {
    try {
      const result = await window.api.fetchGovtEntities()
      if (result.success) setGovtEntities(result.data)
    } catch (err) { setError(err.message) }
  }, [])

  const loadTravelSuppliers = useCallback(async () => {
    try {
      const result = await window.api.fetchTravelSuppliers()
      if (result.success) setTravelSuppliers(result.data)
    } catch (err) { setError(err.message) }
  }, [])

  useEffect(() => {
    loadCategories()
    loadServices()
    loadPaymentCards()
    loadUsers()
    loadGovtEntities()
    loadTravelSuppliers()
    loadDbConfig()
  }, [loadCategories, loadServices, loadPaymentCards, loadUsers, loadGovtEntities, loadTravelSuppliers, loadDbConfig])

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  // ── Shop config submit ──
  const handleSaveShopConfig = useCallback(async (e) => {
    e.preventDefault()
    if (!editShopName.trim()) return
    try {
      setShopSaving(true)
      setError(null)
      const result = await window.api.saveShopConfig({
        shopName: editShopName.trim(),
        address: editAddress.trim(),
        phone: editPhone.trim()
      })
      if (result.success) {
        setSuccessMsg('Shop info updated!')
        if (onShopConfigSaved) onShopConfigSaved(result.data)
      } else { setError(result.error) }
    } catch (err) { setError(err.message) }
    finally { setShopSaving(false) }
  }, [editShopName, editAddress, editPhone, onShopConfigSaved])

  // ── Category submit & handlers ──
  const handleAddCategory = useCallback(async (e) => {
    e.preventDefault()
    if (!categoryName.trim()) return
    try {
      setCategorySaving(true)
      setError(null)
      if (editingCategoryId) {
        const result = await window.api.updateCategory({
          id: editingCategoryId,
          name: categoryName.trim()
        })
        if (result.success) {
          setCategoryName('')
          setEditingCategoryId(null)
          setSuccessMsg(`Category updated to "${result.data.name}"!`)
          await loadCategories()
        } else { setError(result.error) }
      } else {
        const result = await window.api.createCategory({
          name: categoryName.trim(),
          isTravel: false
        })
        if (result.success) {
          setCategoryName('')
          setSuccessMsg(`Category "${result.data.name}" created!`)
          await loadCategories()
        } else { setError(result.error) }
      }
    } catch (err) { setError(err.message) }
    finally { setCategorySaving(false) }
  }, [categoryName, editingCategoryId, loadCategories])

  const handleEditCategory = useCallback((cat) => {
    setEditingCategoryId(cat.id)
    setCategoryName(cat.name)
  }, [])

  const handleCancelCategoryEdit = useCallback(() => {
    setEditingCategoryId(null)
    setCategoryName('')
  }, [])

  const handleDeleteCategory = useCallback(async (cat) => {
    if (cat.name === 'System') {
      alert('Cannot delete the System category.')
      return
    }
    if (!window.confirm(`Are you sure you want to delete the category "${cat.name}"?`)) return
    try {
      const result = await window.api.deleteCategory({ id: cat.id })
      if (result.success) {
        setSuccessMsg(`Category "${cat.name}" deleted!`)
        await loadCategories()
      } else { alert(result.error || 'Failed to delete category.') }
    } catch (err) { alert(err.message) }
  }, [loadCategories])

  // ── Travels Category submit & handlers ──
  const handleAddTravelCategory = useCallback(async (e) => {
    e.preventDefault()
    if (!travelCategoryName.trim()) return
    try {
      setTravelCategorySaving(true)
      setError(null)
      if (editingTravelCategoryId) {
        const result = await window.api.updateCategory({
          id: editingTravelCategoryId,
          name: travelCategoryName.trim()
        })
        if (result.success) {
          setTravelCategoryName('')
          setEditingTravelCategoryId(null)
          setSuccessMsg(`Travel Category updated to "${result.data.name}"!`)
          await loadCategories()
        } else { setError(result.error) }
      } else {
        const result = await window.api.createCategory({
          name: travelCategoryName.trim(),
          isTravel: true
        })
        if (result.success) {
          setTravelCategoryName('')
          setSuccessMsg(`Travel Category "${result.data.name}" created!`)
          await loadCategories()
        } else { setError(result.error) }
      }
    } catch (err) { setError(err.message) }
    finally { setTravelCategorySaving(false) }
  }, [travelCategoryName, editingTravelCategoryId, loadCategories])

  const handleEditTravelCategory = useCallback((cat) => {
    setEditingTravelCategoryId(cat.id)
    setTravelCategoryName(cat.name)
  }, [])

  const handleCancelTravelCategoryEdit = useCallback(() => {
    setEditingTravelCategoryId(null)
    setTravelCategoryName('')
  }, [])

  const handleDeleteTravelCategory = useCallback(async (cat) => {
    if (cat.name === 'System') {
      alert('Cannot delete the System category.')
      return
    }
    if (!window.confirm(`Are you sure you want to delete the travel category "${cat.name}"?`)) return
    try {
      const result = await window.api.deleteCategory({ id: cat.id })
      if (result.success) {
        setSuccessMsg(`Travel Category "${cat.name}" deleted!`)
        await loadCategories()
      } else { alert(result.error || 'Failed to delete category.') }
    } catch (err) { alert(err.message) }
  }, [loadCategories])

  // ── Govt Entity handlers ──
  const handleEditGovtEntity = useCallback((entity) => {
    setEditingGovtEntityId(entity.id)
    setGovtEntityName(entity.name)
  }, [])

  const handleCancelGovtEntityEdit = useCallback(() => {
    setEditingGovtEntityId(null)
    setGovtEntityName('')
  }, [])

  const handleDeleteGovtEntity = useCallback(async (entity) => {
    if (!window.confirm(`Are you sure you want to delete the government entity "${entity.name}"?`)) return
    try {
      setError(null)
      const result = await window.api.deleteGovtEntity({ id: entity.id })
      if (result.success) {
        setSuccessMsg(`Government Entity "${entity.name}" deleted!`)
        await loadGovtEntities()
      } else { setError(result.error) }
    } catch (err) { setError(err.message) }
  }, [loadGovtEntities])

  const handleSaveGovtEntity = useCallback(async (e) => {
    e.preventDefault()
    if (!govtEntityName.trim()) return
    try {
      setGovtEntitySaving(true)
      setError(null)
      if (editingGovtEntityId) {
        const result = await window.api.updateGovtEntity({
          id: editingGovtEntityId,
          name: govtEntityName.trim()
        })
        if (result.success) {
          setSuccessMsg(`Government Entity renamed to "${result.data.name}"!`)
          handleCancelGovtEntityEdit()
          await loadGovtEntities()
        } else { setError(result.error) }
      } else {
        const result = await window.api.createGovtEntity({ name: govtEntityName.trim() })
        if (result.success) {
          setGovtEntityName('')
          setSuccessMsg(`Government Entity "${result.data.name}" added!`)
          await loadGovtEntities()
        } else { setError(result.error) }
      }
    } catch (err) { setError(err.message) }
    finally { setGovtEntitySaving(false) }
  }, [govtEntityName, editingGovtEntityId, loadGovtEntities, handleCancelGovtEntityEdit])

  // ── Travel Supplier handlers ──
  const handleEditTravelSupplier = useCallback((supplier) => {
    setEditingTravelSupplierId(supplier.id)
    setTravelSupplierName(supplier.name)
  }, [])

  const handleCancelTravelSupplierEdit = useCallback(() => {
    setEditingTravelSupplierId(null)
    setTravelSupplierName('')
  }, [])

  const handleDeleteTravelSupplier = useCallback(async (supplier) => {
    if (!window.confirm(`Are you sure you want to delete the travel supplier "${supplier.name}"?`)) return
    try {
      setError(null)
      const result = await window.api.deleteTravelSupplier({ id: supplier.id })
      if (result.success) {
        setSuccessMsg(`Travel supplier "${supplier.name}" deleted!`)
        await loadTravelSuppliers()
      } else { setError(result.error) }
    } catch (err) { setError(err.message) }
  }, [loadTravelSuppliers])

  const handleSaveTravelSupplier = useCallback(async (e) => {
    e.preventDefault()
    if (!travelSupplierName.trim()) return
    try {
      setTravelSupplierSaving(true)
      setError(null)
      if (editingTravelSupplierId) {
        const result = await window.api.updateTravelSupplier({
          id: editingTravelSupplierId,
          name: travelSupplierName.trim()
        })
        if (result.success) {
          setSuccessMsg(`Travel supplier renamed to "${result.data.name}"!`)
          handleCancelTravelSupplierEdit()
          await loadTravelSuppliers()
        } else { setError(result.error) }
      } else {
        const result = await window.api.createTravelSupplier({ name: travelSupplierName.trim() })
        if (result.success) {
          setTravelSupplierName('')
          setSuccessMsg(`Travel supplier "${result.data.name}" added!`)
          await loadTravelSuppliers()
        } else { setError(result.error) }
      }
    } catch (err) { setError(err.message) }
    finally { setTravelSupplierSaving(false) }
  }, [travelSupplierName, editingTravelSupplierId, loadTravelSuppliers, handleCancelTravelSupplierEdit])

  const handleEditService = useCallback((service) => {
    setEditingServiceId(service.id)
    setServiceName(service.name)
    setServiceCategoryId(String(service.categoryId))
  }, [])

  const handleCancelServiceEdit = useCallback(() => {
    setEditingServiceId(null)
    setServiceName('')
    setServiceCategoryId('')
  }, [])

  const handleDeleteService = useCallback(async (service) => {
    if (!window.confirm(`Are you sure you want to delete the service "${service.name}"?`)) return
    try {
      setError(null)
      const result = await window.api.deleteService({ id: service.id })
      if (result.success) {
        setSuccessMsg(`Service "${service.name}" deleted successfully!`)
        await loadServices()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err.message)
    }
  }, [loadServices])

  // ── Service submit ──
  const handleSaveService = useCallback(async (e) => {
    e.preventDefault()
    if (!serviceName.trim() || !serviceCategoryId) return
    try {
      setServiceSaving(true)
      setError(null)
      if (editingServiceId) {
        const result = await window.api.updateService({
          id: editingServiceId,
          name: serviceName.trim(),
          price: 0,
          categoryId: parseInt(serviceCategoryId, 10)
        })
        if (result.success) {
          setSuccessMsg(`Service "${result.data.name}" updated!`)
          handleCancelServiceEdit()
          await loadServices()
        } else { setError(result.error) }
      } else {
        const result = await window.api.createService({
          name: serviceName.trim(),
          price: 0,
          categoryId: parseInt(serviceCategoryId, 10)
        })
        if (result.success) {
          setServiceName('')
          setServiceCategoryId('')
          setSuccessMsg(`Service "${result.data.name}" created!`)
          await loadServices()
        } else { setError(result.error) }
      }
    } catch (err) { setError(err.message) }
    finally { setServiceSaving(false) }
  }, [serviceName, serviceCategoryId, editingServiceId, loadServices, handleCancelServiceEdit])

  // ── Travels Service handlers ──
  const handleEditTravelService = useCallback((service) => {
    setEditingTravelServiceId(service.id)
    setTravelServiceName(service.name)
    setTravelServiceCategoryId(String(service.categoryId))
  }, [])

  const handleCancelTravelServiceEdit = useCallback(() => {
    setEditingTravelServiceId(null)
    setTravelServiceName('')
    setTravelServiceCategoryId('')
  }, [])

  const handleSaveTravelService = useCallback(async (e) => {
    e.preventDefault()
    if (!travelServiceName.trim() || !travelServiceCategoryId) return
    try {
      setTravelServiceSaving(true)
      setError(null)
      if (editingTravelServiceId) {
        const result = await window.api.updateService({
          id: editingTravelServiceId,
          name: travelServiceName.trim(),
          price: 0,
          categoryId: parseInt(travelServiceCategoryId, 10)
        })
        if (result.success) {
          setSuccessMsg(`Travel Service "${result.data.name}" updated!`)
          handleCancelTravelServiceEdit()
          await loadServices()
        } else { setError(result.error) }
      } else {
        const result = await window.api.createService({
          name: travelServiceName.trim(),
          price: 0,
          categoryId: parseInt(travelServiceCategoryId, 10)
        })
        if (result.success) {
          setTravelServiceName('')
          setTravelServiceCategoryId('')
          setSuccessMsg(`Travel Service "${result.data.name}" created!`)
          await loadServices()
        } else { setError(result.error) }
      }
    } catch (err) { setError(err.message) }
    finally { setTravelServiceSaving(false) }
  }, [travelServiceName, travelServiceCategoryId, editingTravelServiceId, loadServices, handleCancelTravelServiceEdit])

  const handleEditCard = useCallback((card) => {
    setEditingCardId(card.id)
    setCardBankName(card.bankName)
  }, [])

  const handleCancelCardEdit = useCallback(() => {
    setEditingCardId(null)
    setCardBankName('')
  }, [])

  const handleDeleteCard = useCallback(async (card) => {
    if (!window.confirm(`Are you sure you want to delete the payment card "${card.bankName}"?`)) return
    try {
      setError(null)
      const result = await window.api.deletePaymentCard({ id: card.id })
      if (result.success) {
        setSuccessMsg(`Card "${card.bankName}" deleted!`)
        await loadPaymentCards()
      } else { setError(result.error) }
    } catch (err) { setError(err.message) }
  }, [loadPaymentCards])

  // ── Payment card submit ──
  const handleSaveCard = useCallback(async (e) => {
    e.preventDefault()
    if (!cardBankName.trim()) return
    try {
      setCardSaving(true)
      setError(null)
      if (editingCardId) {
        const result = await window.api.updatePaymentCard({
          id: editingCardId,
          bankName: cardBankName.trim(),
          isPersonal: false
        })
        if (result.success) {
          setSuccessMsg(`Card renamed to "${result.data.bankName}"!`)
          handleCancelCardEdit()
          await loadPaymentCards()
        } else { setError(result.error) }
      } else {
        const result = await window.api.createPaymentCard({
          bankName: cardBankName.trim(),
          isPersonal: false
        })
        if (result.success) {
          setCardBankName('')
          setSuccessMsg(`Card "${result.data.bankName}" added!`)
          await loadPaymentCards()
        } else { setError(result.error) }
      }
    } catch (err) { setError(err.message) }
    finally { setCardSaving(false) }
  }, [cardBankName, editingCardId, loadPaymentCards, handleCancelCardEdit])

  // ── Toggle card active/inactive ──
  const handleToggleCard = useCallback(async (card) => {
    try {
      setError(null)
      const result = await window.api.togglePaymentCard({ id: card.id, isActive: !card.isActive })
      if (result.success) {
        await loadPaymentCards()
      } else { setError(result.error) }
    } catch (err) { setError(err.message) }
  }, [loadPaymentCards])

  // ── Staff management handlers ──
  const handleSaveStaff = useCallback(async (e) => {
    e.preventDefault()
    if (!staffUsername.trim() || !staffFullName.trim()) return
    if (!editingUserId && !staffPassword) {
      setError('Password is required for new users')
      return
    }

    try {
      setStaffSaving(true)
      setError(null)
      if (editingUserId) {
        const result = await window.api.updateUser({
          id: editingUserId,
          fullName: staffFullName.trim(),
          role: staffRole,
          password: staffPassword.trim() || undefined,
          isActive: true
        })
        if (result.success) {
          setSuccessMsg('Staff member updated!')
          setStaffUsername('')
          setStaffFullName('')
          setStaffPassword('')
          setStaffRole('Staff')
          setEditingUserId(null)
          await loadUsers()
        } else { setError(result.error) }
      } else {
        const result = await window.api.createUser({
          username: staffUsername.trim().toLowerCase(),
          fullName: staffFullName.trim(),
          password: staffPassword,
          role: staffRole,
          isActive: true
        })
        if (result.success) {
          setSuccessMsg(`Staff user "${result.data.username}" created!`)
          setStaffUsername('')
          setStaffFullName('')
          setStaffPassword('')
          setStaffRole('Staff')
          await loadUsers()
        } else { setError(result.error) }
      }
    } catch (err) { setError(err.message) }
    finally { setStaffSaving(false) }
  }, [staffUsername, staffFullName, staffPassword, staffRole, editingUserId, loadUsers])

  const handleEditUser = useCallback((user) => {
    setEditingUserId(user.id)
    setStaffUsername(user.username)
    setStaffFullName(user.fullName)
    setStaffRole(user.role)
    setStaffPassword('')
  }, [])

  const handleCancelStaffEdit = useCallback(() => {
    setEditingUserId(null)
    setStaffUsername('')
    setStaffFullName('')
    setStaffRole('Staff')
    setStaffPassword('')
  }, [])

  const handleToggleUserStatus = useCallback(async (user) => {
    if (user.username === 'admin') {
      setError('Cannot disable the default admin account')
      return
    }
    try {
      setError(null)
      const result = await window.api.toggleUserStatus({ id: user.id, isActive: !user.isActive })
      if (result.success) {
        await loadUsers()
      } else { setError(result.error) }
    } catch (err) { setError(err.message) }
  }, [loadUsers])

  return (
    <div className="admin-settings">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--accent-primary)', display: 'inline-flex' }}><SettingsIcon size={24} /></span> Admin Settings
          </h1>
          <p>Manage shop configuration, users, services, cards, and system data</p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}
          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          <strong>Error:</strong> {error}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success"
          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: 'var(--success)', fontSize: '0.85rem' }}>
          {successMsg}
        </Alert>
      )}

      <div className="admin-grid">

        {/* ═══ SHOP INFO ═══ */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}><CompanyIcon size={18} /></span>
            <div><h3>Office Info</h3><span className="admin-card-count">This installation</span></div>
          </div>
          <Form onSubmit={handleSaveShopConfig} style={{ padding: '20px 22px' }}>
            <Form.Group className="mb-3">
              <Form.Label className="admin-form-label">Office Name</Form.Label>
              <Form.Control type="text" placeholder="e.g. Abu Dhabi Typing Center" value={editShopName} onChange={(e) => setEditShopName(e.target.value)} className="admin-input" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="admin-form-label">Address</Form.Label>
              <Form.Control type="text" placeholder="e.g. Mussafah M-10, Abu Dhabi" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="admin-input" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="admin-form-label">Phone</Form.Label>
              <Form.Control type="tel" placeholder="02 XXX XXXX" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="admin-input" />
            </Form.Group>
            <Button type="submit" className="btn-primary-glow" disabled={shopSaving || !editShopName.trim()} style={{ border: 'none', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {shopSaving ? <Spinner animation="border" size="sm" /> : <><SaveIcon size={14} /> Save Shop Info</>}
            </Button>
          </Form>
        </div>

        {/* ═══ CATEGORIES ═══ */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--success)' }}><FolderIcon size={18} /></span>
            <div><h3>Categories</h3><span className="admin-card-count">{categories.filter(c => !c.isTravel).length} total</span></div>
          </div>
          <Form onSubmit={handleAddCategory} className="admin-form">
            <Form.Control type="text" placeholder="Category name (e.g. Immigration)" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="admin-input" />
            <Button type="submit" className="btn-primary-glow admin-btn" disabled={categorySaving || !categoryName.trim()} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {categorySaving ? <Spinner animation="border" size="sm" /> : editingCategoryId ? <><SaveIcon size={14} /> Update</> : <><PlusIcon size={14} /> Add</>}
            </Button>
            {editingCategoryId && (
              <Button type="button" variant="outline-secondary" className="admin-btn text-light" style={{ padding: '9px 18px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }} onClick={handleCancelCategoryEdit}>
                Cancel
              </Button>
            )}
          </Form>
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {categories.filter(c => !c.isTravel).length === 0 ? (
                  <tr><td colSpan={3} className="admin-empty">No categories yet</td></tr>
                ) : categories.filter(c => !c.isTravel).map((c) => (
                  <tr key={c.id}>
                    <td className="admin-td-id">{c.id}</td>
                    <td>{c.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      {c.name !== 'System' ? (
                        <div className="d-flex justify-content-center gap-2">
                          <button className="btn-outline-subtle d-flex align-items-center gap-1" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => handleEditCategory(c)}>
                            <EditIcon size={12} /> Edit
                          </button>
                          <button className="btn-outline-subtle text-danger d-flex align-items-center gap-1" style={{ padding: '4px 12px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteCategory(c)}>
                            <TrashIcon size={12} /> Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>System Reserved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>

        {/* ═══ TRAVELS CATEGORIES ═══ */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)' }}><PlaneIcon size={18} /></span>
            <div><h3>Travels Categories</h3><span className="admin-card-count">{categories.filter(c => c.isTravel).length} total</span></div>
          </div>
          <Form onSubmit={handleAddTravelCategory} className="admin-form">
            <Form.Control type="text" placeholder="Category name (e.g. Flight Tickets)" value={travelCategoryName} onChange={(e) => setTravelCategoryName(e.target.value)} className="admin-input" />
            <Button type="submit" className="btn-primary-glow admin-btn" disabled={travelCategorySaving || !travelCategoryName.trim()} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {travelCategorySaving ? <Spinner animation="border" size="sm" /> : editingTravelCategoryId ? <><SaveIcon size={14} /> Update</> : <><PlusIcon size={14} /> Add</>}
            </Button>
            {editingTravelCategoryId && (
              <Button type="button" variant="outline-secondary" className="admin-btn text-light" style={{ padding: '9px 18px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }} onClick={handleCancelTravelCategoryEdit}>
                Cancel
              </Button>
            )}
          </Form>
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {categories.filter(c => c.isTravel).length === 0 ? (
                  <tr><td colSpan={3} className="admin-empty">No travels categories yet</td></tr>
                ) : categories.filter(c => c.isTravel).map((c) => (
                  <tr key={c.id}>
                    <td className="admin-td-id">{c.id}</td>
                    <td>{c.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      {c.name !== 'System' ? (
                        <div className="d-flex justify-content-center gap-2">
                          <button className="btn-outline-subtle d-flex align-items-center gap-1" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => handleEditTravelCategory(c)}>
                            <EditIcon size={12} /> Edit
                          </button>
                          <button className="btn-outline-subtle text-danger d-flex align-items-center gap-1" style={{ padding: '4px 12px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteTravelCategory(c)}>
                            <TrashIcon size={12} /> Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>System Reserved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>

        {/* ═══ GOVERNMENT ENTITIES ═══ */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}><CompanyIcon size={18} /></span>
            <div><h3>Govt Entities</h3><span className="admin-card-count">{govtEntities.length} total</span></div>
          </div>
          <Form onSubmit={handleSaveGovtEntity} className="admin-form">
            <Form.Control type="text" placeholder="Entity name (e.g. MOHRE)" value={govtEntityName} onChange={(e) => setGovtEntityName(e.target.value)} className="admin-input" />
            <Button type="submit" className="btn-primary-glow admin-btn" disabled={govtEntitySaving || !govtEntityName.trim()} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {govtEntitySaving ? <Spinner animation="border" size="sm" /> : editingGovtEntityId ? <><SaveIcon size={14} /> Update</> : <><PlusIcon size={14} /> Add</>}
            </Button>
            {editingGovtEntityId && (
              <Button type="button" variant="outline-secondary" className="admin-btn text-light" style={{ padding: '9px 18px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }} onClick={handleCancelGovtEntityEdit}>
                Cancel
              </Button>
            )}
          </Form>
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {govtEntities.length === 0 ? (
                  <tr><td colSpan={3} className="admin-empty">No government entities yet</td></tr>
                ) : govtEntities.map((ent) => (
                  <tr key={ent.id}>
                    <td className="admin-td-id">{ent.id}</td>
                    <td>{ent.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="d-flex justify-content-center gap-2">
                        <button className="btn-outline-subtle d-flex align-items-center gap-1" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => handleEditGovtEntity(ent)}>
                          <EditIcon size={12} /> Edit
                        </button>
                        <button className="btn-outline-subtle text-danger d-flex align-items-center gap-1" style={{ padding: '4px 12px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteGovtEntity(ent)}>
                          <TrashIcon size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>

        {/* ═══ TRAVEL SUPPLIERS ═══ */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)' }}><PlaneIcon size={18} /></span>
            <div><h3>Travel Suppliers</h3><span className="admin-card-count">{travelSuppliers.length} total</span></div>
          </div>
          <Form onSubmit={handleSaveTravelSupplier} className="admin-form">
            <Form.Control type="text" placeholder="Supplier name (e.g. Akbar Travels)" value={travelSupplierName} onChange={(e) => setTravelSupplierName(e.target.value)} className="admin-input" />
            <Button type="submit" className="btn-primary-glow admin-btn" disabled={travelSupplierSaving || !travelSupplierName.trim()} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {travelSupplierSaving ? <Spinner animation="border" size="sm" /> : editingTravelSupplierId ? <><SaveIcon size={14} /> Update</> : <><PlusIcon size={14} /> Add</>}
            </Button>
            {editingTravelSupplierId && (
              <Button type="button" variant="outline-secondary" className="admin-btn text-light" style={{ padding: '9px 18px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }} onClick={handleCancelTravelSupplierEdit}>
                Cancel
              </Button>
            )}
          </Form>
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {travelSuppliers.length === 0 ? (
                  <tr><td colSpan={3} className="admin-empty">No travel suppliers yet</td></tr>
                ) : travelSuppliers.map((sup) => (
                  <tr key={sup.id}>
                    <td className="admin-td-id">{sup.id}</td>
                    <td>{sup.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="d-flex justify-content-center gap-2">
                        <button className="btn-outline-subtle d-flex align-items-center gap-1" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => handleEditTravelSupplier(sup)}>
                          <EditIcon size={12} /> Edit
                        </button>
                        <button className="btn-outline-subtle text-danger d-flex align-items-center gap-1" style={{ padding: '4px 12px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteTravelSupplier(sup)}>
                          <TrashIcon size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>

        {/* ═══ PAYMENT CARDS ═══ */}
        <div className="admin-card admin-card-wide">
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--warning)' }}><CardIcon size={18} /></span>
            <div><h3>Payment Cards</h3><span className="admin-card-count">{paymentCards.length} cards</span></div>
          </div>
          <Form onSubmit={handleSaveCard} className="admin-form">
            <Form.Control type="text" placeholder="Bank name (e.g. ADCB, Emirates NBD, Mashreq)" value={cardBankName} onChange={(e) => setCardBankName(e.target.value)} className="admin-input" />
            <Button type="submit" className="btn-primary-glow admin-btn" disabled={cardSaving || !cardBankName.trim()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {cardSaving ? <Spinner animation="border" size="sm" /> : editingCardId ? <><SaveIcon size={14} /> Update</> : <><PlusIcon size={14} /> Add Card</>}
            </Button>
            {editingCardId && (
              <Button type="button" variant="outline-secondary" className="admin-btn text-light" style={{ padding: '9px 18px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }} onClick={handleCancelCardEdit}>
                Cancel
              </Button>
            )}
          </Form>
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <thead><tr><th>ID</th><th>Bank Name</th><th style={{ textAlign: 'center' }}>Status</th><th style={{ textAlign: 'center' }}>Action</th></tr></thead>
              <tbody>
                {paymentCards.length === 0 ? (
                  <tr><td colSpan={4} className="admin-empty">No payment cards yet</td></tr>
                ) : paymentCards.map((card) => (
                  <tr key={card.id}>
                    <td className="admin-td-id">{card.id}</td>
                    <td>{card.bankName}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-badge ${card.isActive ? 'completed' : 'rejected'}`}>
                        {card.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="d-flex justify-content-center gap-2">
                        <button className="btn-outline-subtle d-flex align-items-center gap-1" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => handleEditCard(card)}>
                          <EditIcon size={12} /> Edit
                        </button>
                        <button className="btn-outline-subtle" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => handleToggleCard(card)}>
                          {card.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button className="btn-outline-subtle text-danger d-flex align-items-center gap-1" style={{ padding: '4px 12px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteCard(card)}>
                          <TrashIcon size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>

        {/* ═══ SERVICES ═══ */}
        <div className="admin-card admin-card-wide">
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'rgba(96,165,250,0.15)', color: 'var(--info)' }}><ApplicationIcon size={18} /></span>
            <div><h3>Services</h3><span className="admin-card-count">{services.filter(s => !s.category?.isTravel).length} total</span></div>
          </div>
          <Form onSubmit={handleSaveService} className="admin-form admin-form-services">
            <Form.Control type="text" placeholder="Service name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="admin-input" />
            <Form.Select value={serviceCategoryId} onChange={(e) => setServiceCategoryId(e.target.value)} className="admin-input">
              <option value="">Select category...</option>
              {categories.filter(c => !c.isTravel).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </Form.Select>
            <Button type="submit" className="btn-primary-glow admin-btn" disabled={serviceSaving || !serviceName.trim() || !serviceCategoryId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {serviceSaving ? <Spinner animation="border" size="sm" /> : editingServiceId ? <><SaveIcon size={14} /> Update</> : <><PlusIcon size={14} /> Add</>}
            </Button>
            {editingServiceId && (
              <Button type="button" variant="outline-secondary" className="admin-btn text-light" style={{ padding: '9px 18px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }} onClick={handleCancelServiceEdit}>
                Cancel
              </Button>
            )}
          </Form>
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Service Name</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {services.filter(s => !s.category?.isTravel).length === 0 ? (
                  <tr><td colSpan={4} className="admin-empty">No services yet — add categories first</td></tr>
                ) : services.filter(s => !s.category?.isTravel).map((s) => (
                  <tr key={s.id}>
                    <td className="admin-td-id">{s.id}</td>
                    <td>{s.name}</td>
                    <td><span className="admin-category-badge">{s.category?.name || '—'}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="d-flex justify-content-center gap-2">
                        <button className="btn-outline-subtle d-flex align-items-center gap-1" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => handleEditService(s)}>
                          <EditIcon size={12} /> Edit
                        </button>
                        <button className="btn-outline-subtle text-danger d-flex align-items-center gap-1" style={{ padding: '4px 12px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteService(s)}>
                          <TrashIcon size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>

        {/* ═══ TRAVELS SERVICES ═══ */}
        <div className="admin-card admin-card-wide">
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)' }}><ApplicationIcon size={18} /></span>
            <div><h3>Travels Services</h3><span className="admin-card-count">{services.filter(s => s.category?.isTravel).length} total</span></div>
          </div>
          <Form onSubmit={handleSaveTravelService} className="admin-form admin-form-services">
            <Form.Control type="text" placeholder="Service name" value={travelServiceName} onChange={(e) => setTravelServiceName(e.target.value)} className="admin-input" />
            <Form.Select value={travelServiceCategoryId} onChange={(e) => setTravelServiceCategoryId(e.target.value)} className="admin-input">
              <option value="">Select category...</option>
              {categories.filter(c => c.isTravel).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </Form.Select>
            <Button type="submit" className="btn-primary-glow admin-btn" disabled={travelServiceSaving || !travelServiceName.trim() || !travelServiceCategoryId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {travelServiceSaving ? <Spinner animation="border" size="sm" /> : editingTravelServiceId ? <><SaveIcon size={14} /> Update</> : <><PlusIcon size={14} /> Add</>}
            </Button>
            {editingTravelServiceId && (
              <Button type="button" variant="outline-secondary" className="admin-btn text-light" style={{ padding: '9px 18px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }} onClick={handleCancelTravelServiceEdit}>
                Cancel
              </Button>
            )}
          </Form>
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Service Name</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {services.filter(s => s.category?.isTravel).length === 0 ? (
                  <tr><td colSpan={4} className="admin-empty">No travels services yet — add categories first</td></tr>
                ) : services.filter(s => s.category?.isTravel).map((s) => (
                  <tr key={s.id}>
                    <td className="admin-td-id">{s.id}</td>
                    <td>{s.name}</td>
                    <td><span className="admin-category-badge">{s.category?.name || '—'}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="d-flex justify-content-center gap-2">
                        <button className="btn-outline-subtle d-flex align-items-center gap-1" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => handleEditTravelService(s)}>
                          <EditIcon size={12} /> Edit
                        </button>
                        <button className="btn-outline-subtle text-danger d-flex align-items-center gap-1" style={{ padding: '4px 12px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteService(s)}>
                          <TrashIcon size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>

        {/* ═══ STAFF MANAGEMENT ═══ */}
        <div className="admin-card admin-card-wide">
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}><SettingsIcon size={18} /></span>
            <div>
              <h3>Staff Management</h3>
              <span className="admin-card-count">{users.length} staff members</span>
            </div>
          </div>

          <Form onSubmit={handleSaveStaff} style={{ padding: '20px 22px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, alignItems: 'end' }}>
              <Form.Group>
                <Form.Label className="admin-form-label">Username</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. staff1"
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  disabled={editingUserId !== null}
                  required
                  className="admin-input"
                />
              </Form.Group>
              <Form.Group>
                <Form.Label className="admin-form-label">Full Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Muhammad"
                  value={staffFullName}
                  onChange={(e) => setStaffFullName(e.target.value)}
                  required
                  className="admin-input"
                />
              </Form.Group>
              <Form.Group>
                <Form.Label className="admin-form-label">
                  {editingUserId ? 'New Password (optional)' : 'Password'}
                </Form.Label>
                <Form.Control
                  type="password"
                  placeholder={editingUserId ? 'Leave blank to keep same' : 'Enter password'}
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  required={!editingUserId}
                  className="admin-input"
                />
              </Form.Group>
              <Form.Group>
                <Form.Label className="admin-form-label">Role</Form.Label>
                <Form.Select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value)}
                  className="admin-input"
                >
                  <option value="Staff">Staff</option>
                  <option value="Admin">Admin</option>
                </Form.Select>
              </Form.Group>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-3">
              {editingUserId && (
                <Button type="button" variant="outline-secondary" size="sm" onClick={handleCancelStaffEdit}>
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" className="btn-primary-glow btn-sm py-2 px-4" disabled={staffSaving} style={{ border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                {staffSaving ? (
                  <Spinner animation="border" size="sm" />
                ) : editingUserId ? (
                  <><SaveIcon size={14} /> Update Staff</>
                ) : (
                  <><PlusIcon size={14} /> Add Staff</>
                )}
              </Button>
            </div>
          </Form>

          <div className="admin-table-wrap" style={{ marginTop: 15 }}>
            <Table className="admin-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="admin-empty">No staff accounts registered.</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td className="fw-semibold">@{user.username}</td>
                      <td>{user.fullName}</td>
                      <td>
                        <span className={`role-badge ${user.role.toLowerCase()}`} style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: user.role === 'Admin' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(108, 99, 255, 0.15)',
                          color: user.role === 'Admin' ? '#c084fc' : '#a5b4fc'
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-badge ${user.isActive ? 'completed' : 'rejected'}`}>
                          {user.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="d-flex justify-content-center gap-2">
                          <button
                            className="btn-outline-subtle py-1 px-2 d-flex align-items-center gap-1"
                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                            onClick={() => handleEditUser(user)}
                          >
                            <EditIcon size={12} /> Edit
                          </button>
                          {user.username !== 'admin' && (
                            <button
                              className="btn-outline-subtle py-1 px-2"
                              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                              onClick={() => handleToggleUserStatus(user)}
                            >
                              {user.isActive ? 'Disable' : 'Enable'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </div>

        {/* ═══ DATABASE SERVER SETTINGS ═══ */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}><SettingsIcon size={18} /></span>
            <div><h3>Database Server</h3><span className="admin-card-count">Client-Server Settings</span></div>
          </div>
          <Form onSubmit={handleSaveDbConfig} style={{ padding: '20px 22px' }}>
            <p className="text-muted small mb-3">To connect this computer to a server, enter the Host IP address and credentials of the server database.</p>
            <Form.Group className="mb-3">
              <Form.Label className="admin-form-label">Database Host (IP / Localhost)</Form.Label>
              <Form.Control type="text" placeholder="e.g. 192.168.1.15" value={dbHost} onChange={(e) => setDbHost(e.target.value)} required className="admin-input" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="admin-form-label">Port</Form.Label>
              <Form.Control type="text" placeholder="5432" value={dbPort} onChange={(e) => setDbPort(e.target.value)} required className="admin-input" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="admin-form-label">Database Name</Form.Label>
              <Form.Control type="text" placeholder="typing_center_db" value={dbName} onChange={(e) => setDbName(e.target.value)} required className="admin-input" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="admin-form-label">Username</Form.Label>
              <Form.Control type="text" placeholder="postgres" value={dbUser} onChange={(e) => setDbUser(e.target.value)} required className="admin-input" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="admin-form-label">Password</Form.Label>
              <Form.Control type="password" placeholder="Database password" value={dbPassword} onChange={(e) => setDbPassword(e.target.value)} required className="admin-input" />
            </Form.Group>
            <div className="d-flex gap-2">
              <Button type="button" variant="outline-secondary" className="text-light" style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }} onClick={handleTestConnection} disabled={dbTesting || dbSaving}>
                {dbTesting ? <Spinner animation="border" size="sm" /> : 'Test Connection'}
              </Button>
              <Button type="submit" className="btn-primary-glow" style={{ flex: 1.2, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} disabled={dbTesting || dbSaving}>
                {dbSaving ? <Spinner animation="border" size="sm" /> : <><SaveIcon size={14} /> Save Settings</>}
              </Button>
            </div>
          </Form>
        </div>

        {/* ═══ DATABASE MAINTENANCE (BACKUP & RESTORE) ═══ */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}><FolderIcon size={18} /></span>
            <div><h3>Backup & Restore</h3><span className="admin-card-count">Maintenance</span></div>
          </div>
          <div style={{ padding: '20px 22px' }}>
            <p className="text-muted small mb-4">Backup your database before manually installing updates, or restore a previous snapshot to roll back changes.</p>
            <div className="d-flex flex-column gap-3">
              <div>
                <Button type="button" className="btn-primary-glow w-100" style={{ border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={handleBackup}>
                  <SaveIcon size={14} /> Backup Database (JSON)
                </Button>
                <div className="text-muted small mt-1 text-center" style={{ fontSize: '0.75rem' }}>Download a complete data snapshot.</div>
              </div>
              <hr style={{ margin: '8px 0', borderColor: 'var(--border-color)' }} />
              <div>
                <Button type="button" className="btn-outline-subtle w-100 py-2 d-flex align-items-center justify-content-center gap-2 text-danger" style={{ border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)' }} onClick={handleRestore}>
                  <RefreshIcon size={14} /> Restore Database (JSON)
                </Button>
                <div className="text-danger small mt-1 text-center" style={{ fontSize: '0.75rem' }}>Warning: Restoring will overwrite existing data.</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default AdminSettings
