import { useState, useEffect, useCallback, useMemo } from 'react'
import { Table, Modal, Button, Form, Spinner, Alert } from 'react-bootstrap'
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  RefreshIcon,
  IndividualIcon,
  LicenseIcon,
  InsuranceIcon,
  VisaIcon,
  FolderIcon,
  BackIcon,
  SaveIcon,
  SalesIcon,
  PhoneIcon,
  ApplicationIcon
} from './Icons'

export default function IndividualManagement({ initialIndividualId, onClearInitialId }) {
  // Navigation & Individual Selection
  const [individuals, setIndividuals] = useState([])
  const [selectedIndividual, setSelectedIndividual] = useState(null)

  // Handle initial selected individual from Dashboard link
  useEffect(() => {
    if (initialIndividualId && individuals.length > 0) {
      const found = individuals.find(ind => ind.id === parseInt(initialIndividualId, 10))
      if (found) {
        setSelectedIndividual(found)
      }
    }
  }, [initialIndividualId, individuals])

  // Lists & Loaders
  const [loadingIndividuals, setLoadingIndividuals] = useState(true)
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [records, setRecords] = useState([])
  const [individualsError, setIndividualsError] = useState(null)
  const [recordsError, setRecordsError] = useState(null)

  // Search & Filter
  const [individualSearch, setIndividualSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Visa') // Default tab for individuals

  // Dynamic Categories
  const [categories, setCategories] = useState(['Visa', 'Health Insurance', 'Emirates ID', 'Other Documents'])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryInput, setNewCategoryInput] = useState('')

  // Applications Setup
  const [applications, setApplications] = useState([])
  const [loadingApps, setLoadingApps] = useState(false)

  // Individual Modals
  const [showIndividualModal, setShowIndividualModal] = useState(false)
  const [editingIndividual, setEditingIndividual] = useState(null)
  const [individualNameInput, setIndividualNameInput] = useState('')
  const [individualPhoneInput, setIndividualPhoneInput] = useState('')
  const [savingIndividual, setSavingIndividual] = useState(false)

  // Advance Payment Modal
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [advanceAmountInput, setAdvanceAmountInput] = useState('')
  const [adjustingAdvance, setAdjustingAdvance] = useState(false)
  const [paymentCards, setPaymentCards] = useState([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Cash')

  // Record Modals (Visa, Health Insurance, Emirates ID, etc.)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [savingRecord, setSavingRecord] = useState(false)

  // Record Form Fields
  const [recordForm, setRecordForm] = useState({
    holderName: '',
    documentNumber: '',
    documentType: '',
    issueDate: '',
    expiryDate: '',
    notes: '',
    status: 'Active'
  })

  // Expiry styling helper
  const getDaysLeftInfo = (expiryDateStr) => {
    if (!expiryDateStr) return { days: null, text: 'No Expiry', cls: 'text-muted' }
    const expiry = new Date(expiryDateStr)
    const today = new Date()
    // Reset hours to compare dates only
    expiry.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)

    const diffTime = expiry - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { days: diffDays, text: `Expired (${Math.abs(diffDays)}d ago)`, cls: 'text-danger fw-bold' }
    } else if (diffDays === 0) {
      return { days: diffDays, text: 'Expires Today', cls: 'text-warning fw-bold animate-pulse' }
    } else if (diffDays <= 30) {
      return { days: diffDays, text: `${diffDays} days left`, cls: 'text-warning fw-bold' }
    } else {
      return { days: diffDays, text: `${diffDays} days left`, cls: 'text-success' }
    }
  }

  const getCategoryIcon = useCallback((cat) => {
    switch (cat) {
      case 'Emirates ID': return <LicenseIcon className="me-1" size={16} />
      case 'Health Insurance': return <InsuranceIcon className="me-1" size={16} />
      case 'Visa': return <VisaIcon className="me-1" size={16} />
      case 'Other Documents': return <FolderIcon className="me-1" size={16} />
      default: return <FolderIcon className="me-1" size={16} />
    }
  }, [])

  // Load Individuals
  const loadIndividuals = useCallback(async () => {
    setLoadingIndividuals(true)
    setIndividualsError(null)
    try {
      const res = await window.api.fetchIndividuals()
      if (res.success) {
        setIndividuals(res.data)
      } else {
        setIndividualsError(res.error || 'Failed to load individuals')
      }
    } catch (err) {
      setIndividualsError(err.message)
    } finally {
      setLoadingIndividuals(false)
    }
  }, [])

  // Load Individual Records
  const loadRecords = useCallback(async (individualId) => {
    if (!individualId) return
    setLoadingRecords(true)
    setRecordsError(null)
    try {
      const res = await window.api.fetchIndividualRecords({ individualId })
      if (res.success) {
        setRecords(res.data)
        // Extract all category names from records to dynamically merge custom ones
        const foundCats = res.data.map(r => r.category)
        setCategories(prev => {
          const combined = new Set([...prev, ...foundCats])
          return Array.from(combined)
        })
      } else {
        setRecordsError(res.error || 'Failed to load individual records')
      }
    } catch (err) {
      setRecordsError(err.message)
    } finally {
      setLoadingRecords(false)
    }
  }, [])

  const loadPaymentCards = useCallback(async () => {
    try {
      const res = await window.api.fetchPaymentCards()
      if (res.success) {
        setPaymentCards(res.data.filter(c => c.isActive))
      }
    } catch (err) {
      console.error('Failed to load payment cards:', err)
    }
  }, [])

  useEffect(() => {
    loadIndividuals()
    loadPaymentCards()
  }, [loadIndividuals, loadPaymentCards])

  const loadApplications = useCallback(async () => {
    setLoadingApps(true)
    try {
      const res = await window.api.fetchApplications()
      if (res.success) {
        setApplications(res.data)
      }
    } catch (err) {
      console.error('Failed to load applications:', err)
    } finally {
      setLoadingApps(false)
    }
  }, [])

  const filteredApps = useMemo(() => {
    if (!selectedIndividual) return []
    return applications.filter(a => a.customerType === 'Individual' && a.customerName === selectedIndividual.name)
  }, [applications, selectedIndividual])

  useEffect(() => {
    if (selectedIndividual) {
      loadRecords(selectedIndividual.id)
      loadApplications()
    }
  }, [selectedIndividual, loadRecords, loadApplications])

  // Add or Edit Individual
  const handleOpenIndividualModal = (individual = null) => {
    if (individual) {
      setEditingIndividual(individual)
      setIndividualNameInput(individual.name)
      setIndividualPhoneInput(individual.phone || '')
    } else {
      setEditingIndividual(null)
      setIndividualNameInput('')
      setIndividualPhoneInput('')
    }
    setIndividualsError(null)
    setShowIndividualModal(true)
  }

  const handleSaveIndividual = async (e) => {
    e.preventDefault()
    if (!individualNameInput.trim()) return

    setSavingIndividual(true)
    try {
      let res
      if (editingIndividual) {
        res = await window.api.updateIndividual({
          id: editingIndividual.id,
          name: individualNameInput.trim(),
          phone: individualPhoneInput.trim()
        })
      } else {
        res = await window.api.createIndividual({
          name: individualNameInput.trim(),
          phone: individualPhoneInput.trim()
        })
      }

      if (res.success) {
        await loadIndividuals()
        if (selectedIndividual && editingIndividual && selectedIndividual.id === editingIndividual.id) {
          setSelectedIndividual(res.data)
        }
        setShowIndividualModal(false)
      } else {
        setIndividualsError(res.error || 'Failed to save individual')
      }
    } catch (err) {
      setIndividualsError(err.message)
    } finally {
      setSavingIndividual(false)
    }
  }

  // Delete Individual
  const handleDeleteIndividual = async (individual) => {
    if (!window.confirm(`Are you sure you want to delete "${individual.name}"?\nThis will permanently delete all visa, insurance, and Emirates ID records associated with this client.`)) return

    try {
      const res = await window.api.deleteIndividual({ id: individual.id })
      if (res.success) {
        if (selectedIndividual && selectedIndividual.id === individual.id) {
          setSelectedIndividual(null)
        }
        await loadIndividuals()
      } else {
        alert(res.error || 'Failed to delete individual')
      }
    } catch (err) {
      alert(err.message)
    }
  }

  // Manage Advance Balance
  const handleOpenAdvanceModal = () => {
    setAdvanceAmountInput('')
    setSelectedPaymentMethod('Cash')
    setShowAdvanceModal(true)
  }

  const handleAdjustAdvance = async (e) => {
    e.preventDefault()
    if (!selectedIndividual) return
    const amt = parseFloat(advanceAmountInput)
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid positive amount.')
      return
    }

    try {
      setAdjustingAdvance(true)
      
      const depositServiceRes = await window.api.getAdvanceDepositService()
      if (!depositServiceRes.success || !depositServiceRes.data) {
        alert('Failed to retrieve Advance Deposit service: ' + (depositServiceRes.error || 'Unknown error'))
        setAdjustingAdvance(false)
        return
      }
      const depositService = depositServiceRes.data

      let staffUsername = 'System'
      try {
        const storedUser = localStorage.getItem('currentUser')
        if (storedUser) {
          const userObj = JSON.parse(storedUser)
          if (userObj && userObj.username) {
            staffUsername = userObj.username
          }
        }
      } catch (err) {
        console.error('Failed to parse current user:', err)
      }

      const res = await window.api.createApplication({
        customerName: selectedIndividual.name,
        phone: selectedIndividual.phone || '',
        emiratesId: '',
        customerType: 'Individual',
        serviceId: depositService.id,
        serviceCharge: amt,
        customerPayment: selectedPaymentMethod,
        govtFee: 0,
        govtPayment: 'N/A',
        govtEntity: '',
        typingFee: 0,
        status: 'Completed',
        createdBy: staffUsername
      })

      if (res.success) {
        // Reload individual list
        const updatedRes = await window.api.fetchIndividuals()
        if (updatedRes.success) {
          setIndividuals(updatedRes.data)
          // Update selected individual to show new balance
          const found = updatedRes.data.find(i => i.id === selectedIndividual.id)
          if (found) setSelectedIndividual(found)
        }
        setShowAdvanceModal(false)
      } else {
        alert(res.error || 'Failed to adjust advance')
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setAdjustingAdvance(false)
    }
  }

  // Record Actions (Visa, Health Insurance, etc.)
  const handleOpenRecordModal = (record = null) => {
    setRecordsError(null)
    if (record) {
      setEditingRecord(record)
      setRecordForm({
        holderName: record.holderName,
        documentNumber: record.documentNumber,
        documentType: record.documentType,
        issueDate: record.issueDate ? new Date(record.issueDate).toISOString().split('T')[0] : '',
        expiryDate: record.expiryDate ? new Date(record.expiryDate).toISOString().split('T')[0] : '',
        notes: record.notes,
        status: record.status
      })
    } else {
      setEditingRecord(null)
      setRecordForm({
        holderName: selectedIndividual ? selectedIndividual.name : '', // Default to individual's name (Self)
        documentNumber: '',
        documentType: '',
        issueDate: '',
        expiryDate: '',
        notes: '',
        status: 'Active'
      })
    }
    setShowRecordModal(true)
  }

  const handleAddCustomCategory = (e) => {
    e.preventDefault()
    const trimmed = newCategoryInput.trim()
    if (!trimmed) return
    setCategories(prev => {
      const combined = new Set([...prev, trimmed])
      return Array.from(combined)
    })
    setSelectedCategory(trimmed)
    setNewCategoryInput('')
    setShowCategoryModal(false)
  }

  const handleRecordInputChange = (e) => {
    const { name, value } = e.target
    setRecordForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveRecord = async (e) => {
    e.preventDefault()
    if (!selectedIndividual) return

    setSavingRecord(true)
    try {
      const payload = {
        ...recordForm,
        individualId: selectedIndividual.id,
        category: selectedCategory
      }

      let res
      if (editingRecord) {
        res = await window.api.updateIndividualRecord({ id: editingRecord.id, ...payload })
      } else {
        res = await window.api.createIndividualRecord(payload)
      }

      if (res.success) {
        await loadRecords(selectedIndividual.id)
        setShowRecordModal(false)
      } else {
        setRecordsError(res.error || 'Failed to save record')
      }
    } catch (err) {
      setRecordsError(err.message)
    } finally {
      setSavingRecord(false)
    }
  }

  const handleDeleteRecord = async (record) => {
    if (!window.confirm(`Are you sure you want to delete this record for "${record.holderName || record.documentNumber}"?`)) return

    try {
      const res = await window.api.deleteIndividualRecord({ id: record.id })
      if (res.success) {
        await loadRecords(selectedIndividual.id)
      } else {
        alert(res.error || 'Failed to delete record')
      }
    } catch (err) {
      alert(err.message)
    }
  }

  // Filtered List of Individuals
  const filteredIndividuals = useMemo(() => {
    return individuals.filter(ind => ind.name.toLowerCase().includes(individualSearch.toLowerCase()))
  }, [individuals, individualSearch])

  // Filtered list of records for the active tab/category
  const filteredRecords = useMemo(() => {
    return records.filter(r => r.category === selectedCategory)
  }, [records, selectedCategory])

  // Field helper labels
  const getHolderFieldLabel = () => {
    return 'Applicant / Holder Name'
  }

  const getDocNumberLabel = () => {
    switch (selectedCategory) {
      case 'Visa':
        return 'Visa File / UID Number'
      case 'Health Insurance':
        return 'Policy / Card Number'
      case 'Emirates ID':
        return 'Emirates ID Number'
      default:
        return 'Document Number'
    }
  }

  const getDocTypeLabel = () => {
    switch (selectedCategory) {
      case 'Visa':
        return 'Visa Type (e.g. Residence, Partner, Tourist)'
      case 'Health Insurance':
        return 'Insurance Provider (e.g. Daman, Thiqa)'
      case 'Emirates ID':
        return 'Card Type (e.g. Citizen, Resident)'
      default:
        return 'Document Type / Details'
    }
  }

  return (
    <div className="company-management-container">
      {/* ─────────────────────────────────────────────────────────────
          1. INDIVIDUAL LIST VIEW (when no individual selected)
          ───────────────────────────────────────────────────────────── */}
      {!selectedIndividual ? (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <h1>Individual Directory</h1>
              <p>Manage typing center personal accounts and track visas, insurance, and Emirates ID files</p>
            </div>
            <div className="page-header-actions">
              <button className="btn-primary-glow" onClick={() => handleOpenIndividualModal()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <PlusIcon size={16} /> New Client
              </button>
            </div>
          </div>

          <div className="grid-container" style={{ marginTop: 20 }}>
            <div className="grid-toolbar">
              <div className="grid-toolbar-left">
                <h3>Registered Individuals</h3>
                <span className="record-count">{filteredIndividuals.length} clients</span>
              </div>
              <div className="grid-toolbar-right">
                <input
                  className="grid-filter-input"
                  type="text"
                  placeholder="Search individuals..."
                  value={individualSearch}
                  onChange={(e) => setIndividualSearch(e.target.value)}
                />
                <button className="btn-outline-subtle" onClick={loadIndividuals} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RefreshIcon size={14} /> Refresh
                </button>
              </div>
            </div>

            <div className="admin-table-wrap">
              {loadingIndividuals ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
                  <Spinner animation="border" variant="light" size="sm" />
                  <span style={{ color: 'var(--text-secondary)' }}>Loading clients...</span>
                </div>
              ) : filteredIndividuals.length === 0 ? (
                <div className="admin-empty">
                  No individuals found. Add a client to start tracking their documents.
                </div>
              ) : (
                <Table className="admin-table">
                  <thead>
                    <tr>
                      <th>Client Name</th>
                      <th>Phone Number</th>
                      <th>Advance Balance</th>
                      <th style={{ textAlign: 'center', width: 330 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIndividuals.map((ind) => (
                      <tr key={ind.id}>
                        <td style={{ verticalAlign: 'middle', fontWeight: 600, fontSize: '1.02rem', color: 'var(--text-primary)' }}>
                          <span style={{ marginRight: 10, color: 'var(--accent-primary)', display: 'inline-flex', verticalAlign: 'middle' }}>
                            <IndividualIcon size={18} />
                          </span>
                          <a href="#" className="company-link-name" onClick={(e) => { e.preventDefault(); setSelectedIndividual(ind); }} style={{ color: 'var(--text-primary)', textDecoration: 'none', verticalAlign: 'middle' }}>
                            {ind.name}
                          </a>
                        </td>
                        <td style={{ verticalAlign: 'middle', color: 'var(--text-secondary)' }}>
                          {ind.phone || '—'}
                        </td>
                        <td style={{ verticalAlign: 'middle', fontWeight: 600, color: 'var(--success)' }}>
                          AED {(ind.advanceBalance || 0).toFixed(2)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                            <Button variant="outline-primary" size="sm" className="py-1 px-3 d-flex align-items-center gap-1" onClick={() => setSelectedIndividual(ind)}>
                              <FolderIcon size={14} /> Open Files
                            </Button>
                            <Button variant="outline-warning" size="sm" className="py-1 px-2 d-flex align-items-center gap-1" onClick={() => handleOpenIndividualModal(ind)}>
                              <EditIcon size={14} /> Edit
                            </Button>
                            <Button variant="outline-danger" size="sm" className="py-1 px-2 d-flex align-items-center gap-1" onClick={() => handleDeleteIndividual(ind)}>
                              <TrashIcon size={14} /> Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          </div>
        </>
      ) : (
        /* ─────────────────────────────────────────────────────────────
           2. INDIVIDUAL DETAILS SCREEN (with tabs: Visa, Insurance, etc.)
           ───────────────────────────────────────────────────────────── */
        <>
          <div className="page-header">
            <div className="page-header-left">
              <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); setSelectedIndividual(null); if (onClearInitialId) onClearInitialId(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: 10, fontSize: '0.9rem', fontWeight: 600 }}>
                <BackIcon size={14} /> Back to Directory
              </a>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--accent-primary)', display: 'inline-flex' }}><IndividualIcon size={24} /></span> {selectedIndividual.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span className="badge bg-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.95rem', padding: '6px 12px', borderRadius: '6px', fontWeight: 600 }}>
                  <SalesIcon size={16} /> Advance Balance: AED {(selectedIndividual.advanceBalance || 0).toFixed(2)}
                </span>
                <Button variant="outline-success" size="sm" className="py-1 px-2 fw-bold d-inline-flex align-items-center gap-1" onClick={handleOpenAdvanceModal} style={{ fontSize: '0.82rem' }}>
                  <PlusIcon size={14} /> Receive Advance
                </Button>
              </div>
              <p>Manage visa files, health insurance, Emirates ID cards, and other details for this client. {selectedIndividual.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8 }}><PhoneIcon size={14} className="text-muted" />{selectedIndividual.phone}</span>}</p>
            </div>
            <div className="page-header-actions" style={{ display: 'flex', gap: 10, alignSelf: 'flex-end' }}>
              <button className="btn-outline-subtle" onClick={() => handleOpenIndividualModal(selectedIndividual)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <EditIcon size={14} /> Edit
              </button>
              <button className="btn-primary-glow" onClick={() => handleOpenRecordModal()} style={{ display: 'flex', alignItems: 'center', gap: 6 }} disabled={selectedCategory === 'Applications'}>
                <PlusIcon size={14} /> Add {selectedCategory}
              </button>
            </div>
          </div>

          <div className="company-details-layout">
            {/* Left Sidebar: Categories List Directory */}
            <div className="company-categories-sidebar">
              <div className="grid-container" style={{ padding: 16, background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ fontFamily: 'Outfit', fontSize: '1rem', fontWeight: 700, margin: '0 0 8px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FolderIcon size={18} className="text-secondary" /> Document Directory
                </h4>
                <div className="d-flex flex-column gap-1" style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`category-item-btn ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>{getCategoryIcon(cat)}</span>
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>{cat}</span>
                    </button>
                  ))}

                  <hr style={{ margin: '8px 0', borderColor: 'var(--border-color)' }} />

                  {/* Applications History Item */}
                  <button
                    type="button"
                    className={`category-item-btn ${selectedCategory === 'Applications' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('Applications')}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}><ApplicationIcon size={16} className="me-1" /></span>
                    <span style={{ flex: 1, textAlign: 'left' }}>Applications History</span>
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-outline-subtle w-100 justify-content-center mt-2"
                  style={{ fontSize: '0.82rem', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => setShowCategoryModal(true)}
                >
                  <PlusIcon size={14} /> Add Category
                </button>
              </div>
            </div>

            {/* Right Pane: Records list for selected category OR Applications History */}
            {selectedCategory === 'Applications' ? (
              <div className="company-records-pane">
                <div className="grid-container" style={{ marginTop: 0 }}>
                  <div className="grid-toolbar">
                    <div className="grid-toolbar-left" style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', marginRight: 8 }}><ApplicationIcon size={16} /></span>
                      <h3 style={{ display: 'inline-flex', alignItems: 'center', margin: 0 }}>Applications History</h3>
                      <span className="record-count">{filteredApps.length} transactions</span>
                    </div>
                    <div className="grid-toolbar-right">
                      <button className="btn-outline-subtle" onClick={loadApplications} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <RefreshIcon size={14} /> Refresh
                      </button>
                    </div>
                  </div>

                  <div className="admin-table-wrap">
                    {loadingApps ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
                        <Spinner animation="border" variant="light" size="sm" />
                        <span style={{ color: 'var(--text-secondary)' }}>Loading transactions...</span>
                      </div>
                    ) : filteredApps.length === 0 ? (
                      <div className="admin-empty" style={{ padding: '40px 20px', fontSize: '0.92rem' }}>
                        📄 No applications recorded for this client yet.
                      </div>
                    ) : (
                      <Table className="admin-table">
                        <thead>
                          <tr>
                            <th style={{ width: 100 }}>ID</th>
                            <th>Service</th>
                            <th style={{ textAlign: 'right', width: 140 }}>Received (AED)</th>
                            <th style={{ textAlign: 'right', width: 140 }}>Paid (AED)</th>
                            <th style={{ textAlign: 'right', width: 140 }}>Profit (AED)</th>
                            <th>Paid By</th>
                            <th>Date</th>
                            <th style={{ textAlign: 'center', width: 120 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredApps.map((a) => (
                            <tr key={a.id}>
                              <td style={{ fontVariantNumeric: 'tabular-nums' }}>{a.id}</td>
                              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.service?.name || '—'}</td>
                              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.serviceCharge.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.govtFee.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--success)', fontWeight: 600 }}>{a.typingFee.toFixed(2)}</td>
                              <td>{a.customerPayment}</td>
                              <td>{new Date(a.createdAt).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`status-badge ${a.status.toLowerCase().replace(/\s+/g, '-')}`}>{a.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="company-records-pane">
                <div className="grid-container" style={{ marginTop: 0 }}>
                  <div className="grid-toolbar">
                    <div className="grid-toolbar-left" style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', marginRight: 8 }}>{getCategoryIcon(selectedCategory)}</span>
                      <h3 style={{ display: 'inline-flex', alignItems: 'center', margin: 0 }}>{selectedCategory} Entries</h3>
                      <span className="record-count">{filteredRecords.length} records</span>
                    </div>
                    <div className="grid-toolbar-right">
                      <button className="btn-outline-subtle" onClick={() => loadRecords(selectedIndividual.id)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <RefreshIcon size={14} /> Refresh
                      </button>
                    </div>
                  </div>

                  <div className="admin-table-wrap">
                    {loadingRecords ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
                        <Spinner animation="border" variant="light" size="sm" />
                        <span style={{ color: 'var(--text-secondary)' }}>Loading documents...</span>
                      </div>
                    ) : filteredRecords.length === 0 ? (
                      <div className="admin-empty" style={{ padding: '40px 20px', fontSize: '0.92rem' }}>
                        📄 No records added in <strong>{selectedCategory}</strong> yet. Click "+ Add {selectedCategory}" to insert your first record.
                      </div>
                    ) : (
                      <Table className="admin-table">
                        <thead>
                          <tr>
                            <th>{getHolderFieldLabel()}</th>
                            <th>{getDocNumberLabel()}</th>
                            <th>{getDocTypeLabel()}</th>
                            <th style={{ width: 140 }}>Issue Date</th>
                            <th style={{ width: 140 }}>Expiry Date</th>
                            <th style={{ width: 150 }}>Status / Days</th>
                            <th>Notes</th>
                            <th style={{ textAlign: 'center', width: 140 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRecords.map((r) => {
                            const expiryInfo = getDaysLeftInfo(r.expiryDate)
                            return (
                              <tr key={r.id}>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.holderName || '—'}</td>
                                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{r.documentNumber || '—'}</td>
                                <td>{r.documentType || '—'}</td>
                                <td>{r.issueDate ? new Date(r.issueDate).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                                <td>{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                                <td>
                                  <div className="d-flex flex-column">
                                    <span className={`small ${expiryInfo.cls}`}>{expiryInfo.text}</span>
                                  </div>
                                </td>
                                <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.notes}>
                                  {r.notes || '—'}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                                    <Button variant="outline-warning" size="sm" style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center' }} onClick={() => handleOpenRecordModal(r)}>
                                      <EditIcon size={14} />
                                    </Button>
                                    <Button variant="outline-danger" size="sm" style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center' }} onClick={() => handleDeleteRecord(r)}>
                                      <TrashIcon size={14} />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. INDIVIDUAL FORM MODAL (Add / Edit Client)
          ───────────────────────────────────────────────────────────── */}
      <Modal show={showIndividualModal} onHide={() => setShowIndividualModal(false)} centered contentClassName="modal-dark">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title>{editingIndividual ? 'Edit Client Details' : 'New Individual Client'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveIndividual}>
          <Modal.Body>
            {individualsError && <Alert variant="danger">{individualsError}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Client Name <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter client's full name"
                value={individualNameInput}
                onChange={(e) => setIndividualNameInput(e.target.value)}
                required
                autoFocus
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone Number</Form.Label>
              <Form.Control
                type="tel"
                placeholder="e.g. 050 123 4567"
                value={individualPhoneInput}
                onChange={(e) => setIndividualPhoneInput(e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowIndividualModal(false)} disabled={savingIndividual}>Cancel</Button>
            <Button type="submit" className="btn-primary-glow" disabled={savingIndividual || !individualNameInput.trim()} style={{ border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              {savingIndividual ? <><Spinner animation="border" size="sm" className="me-2" />Saving...</> : <><SaveIcon size={14} /> Save</>}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          4. RECORD FORM MODAL (Add / Edit Visa, Insurance, Emirates ID)
          ───────────────────────────────────────────────────────────── */}
      <Modal show={showRecordModal} onHide={() => setShowRecordModal(false)} size="lg" centered contentClassName="modal-dark">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title>
            {editingRecord ? 'Edit' : 'Add'} {selectedCategory} Record
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveRecord}>
          <Modal.Body>
            {recordsError && <Alert variant="danger">{recordsError}</Alert>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Group className="mb-3">
                <Form.Label>{getHolderFieldLabel()} <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="holderName"
                  placeholder="e.g. Client Name or Dependent Name"
                  value={recordForm.holderName}
                  onChange={handleRecordInputChange}
                  required
                  autoFocus
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{getDocNumberLabel()} <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="documentNumber"
                  placeholder={`Enter ${getDocNumberLabel().toLowerCase()}`}
                  value={recordForm.documentNumber}
                  onChange={handleRecordInputChange}
                  required
                />
              </Form.Group>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Group className="mb-3">
                <Form.Label>{getDocTypeLabel()}</Form.Label>
                <Form.Control
                  type="text"
                  name="documentType"
                  placeholder={`e.g. ${selectedCategory === 'Health Insurance' ? 'Daman' : selectedCategory === 'Visa' ? 'Residence' : 'Resident Card'}`}
                  value={recordForm.documentType}
                  onChange={handleRecordInputChange}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={recordForm.status}
                  onChange={handleRecordInputChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Form.Select>
              </Form.Group>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Group className="mb-3">
                <Form.Label>Issue Date</Form.Label>
                <Form.Control
                  type="date"
                  name="issueDate"
                  value={recordForm.issueDate}
                  onChange={handleRecordInputChange}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Expiry Date <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                <Form.Control
                  type="date"
                  name="expiryDate"
                  value={recordForm.expiryDate}
                  onChange={handleRecordInputChange}
                  required
                />
              </Form.Group>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Additional details / Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                placeholder="Enter additional remarks or details here..."
                value={recordForm.notes}
                onChange={handleRecordInputChange}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowRecordModal(false)} disabled={savingRecord}>Cancel</Button>
            <Button type="submit" className="btn-primary-glow" disabled={savingRecord} style={{ border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              {savingRecord ? <><Spinner animation="border" size="sm" className="me-2" />Saving...</> : <><SaveIcon size={14} /> Save</>}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          5. ADD CUSTOM CATEGORY MODAL
          ───────────────────────────────────────────────────────────── */}
      <Modal show={showCategoryModal} onHide={() => setShowCategoryModal(false)} centered contentClassName="modal-dark">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title>Add Custom Category</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddCustomCategory}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Category Name <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Labor Card, Driving License, Passport"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                required
                autoFocus
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowCategoryModal(false)}>Cancel</Button>
            <Button type="submit" className="btn-primary-glow" disabled={!newCategoryInput.trim()} style={{ border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <SaveIcon size={14} /> Save Category
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ─── Receive Advance Modal ─── */}
      <Modal show={showAdvanceModal} onHide={() => setShowAdvanceModal(false)} centered contentClassName="modal-dark">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title>Receive Advance — {selectedIndividual?.name}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAdjustAdvance}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Current Balance</Form.Label>
              <Form.Control type="text" readOnly value={`AED ${(selectedIndividual?.advanceBalance || 0).toFixed(2)}`} style={{ background: '#1c1f2e', color: '#fff', border: '1px solid var(--border-color)', fontWeight: 600 }} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Amount to Add (AED)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                placeholder="e.g. 10000"
                value={advanceAmountInput}
                onChange={(e) => setAdvanceAmountInput(e.target.value)}
                required
                autoFocus
                min="0.01"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Payment Method</Form.Label>
              <Form.Select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card (General)</option>
                <option value="Cheque">Cheque</option>
                <option value="Account Transfer">Account Transfer</option>
                {paymentCards.map((c) => (
                  <option key={c.id} value={c.bankName}>
                    {c.bankName}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowAdvanceModal(false)}>Cancel</Button>
            <Button type="submit" className="btn-success-glow" disabled={adjustingAdvance || !advanceAmountInput} style={{ border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              {adjustingAdvance ? <Spinner animation="border" size="sm" /> : 'Apply Deposit'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
