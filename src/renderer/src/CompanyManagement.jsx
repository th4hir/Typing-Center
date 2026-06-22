import { useState, useEffect, useCallback, useMemo } from 'react'
import { Table, Modal, Button, Form, Spinner, Alert } from 'react-bootstrap'
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  RefreshIcon,
  CompanyIcon,
  LicenseIcon,
  InsuranceIcon,
  VisaIcon,
  FolderIcon,
  BackIcon,
  SaveIcon
} from './Icons'

export default function CompanyManagement() {
  // Navigation & Company Selection
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)

  // Lists & Loaders
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [records, setRecords] = useState([])
  const [companiesError, setCompaniesError] = useState(null)
  const [recordsError, setRecordsError] = useState(null)

  // Search & Filter
  const [companySearch, setCompanySearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Trade License') // Default tab

  // Dynamic Categories
  const [categories, setCategories] = useState(['Trade License', 'Health Insurance', 'Visa', 'Other Documents'])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryInput, setNewCategoryInput] = useState('')

  // Company Modals
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [companyNameInput, setCompanyNameInput] = useState('')
  const [savingCompany, setSavingCompany] = useState(false)

  // Record Modals (Trade License, Health Insurance, Visa, etc.)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [savingRecord, setSavingRecord] = useState(false)

  // Record Form Fields
  const [recordForm, setRecordForm] = useState({
    employeeName: '',
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
      case 'Trade License': return <LicenseIcon className="me-1" size={16} />
      case 'Health Insurance': return <InsuranceIcon className="me-1" size={16} />
      case 'Visa': return <VisaIcon className="me-1" size={16} />
      case 'Other Documents': return <FolderIcon className="me-1" size={16} />
      default: return <FolderIcon className="me-1" size={16} />
    }
  }, [])


  // Load Companies
  const loadCompanies = useCallback(async () => {
    setLoadingCompanies(true)
    setCompaniesError(null)
    try {
      const res = await window.api.fetchCompanies()
      if (res.success) {
        setCompanies(res.data)
      } else {
        setCompaniesError(res.error || 'Failed to load companies')
      }
    } catch (err) {
      setCompaniesError(err.message)
    } finally {
      setLoadingCompanies(false)
    }
  }, [])

  // Load Company Records
  const loadRecords = useCallback(async (companyId) => {
    if (!companyId) return
    setLoadingRecords(true)
    setRecordsError(null)
    try {
      const res = await window.api.fetchCompanyRecords({ companyId })
      if (res.success) {
        setRecords(res.data)
        // Extract all category names from records to dynamically merge custom ones
        const foundCats = res.data.map(r => r.category)
        setCategories(prev => {
          const combined = new Set([...prev, ...foundCats])
          return Array.from(combined)
        })
      } else {
        setRecordsError(res.error || 'Failed to load company records')
      }
    } catch (err) {
      setRecordsError(err.message)
    } finally {
      setLoadingRecords(false)
    }
  }, [])

  useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  useEffect(() => {
    if (selectedCompany) {
      loadRecords(selectedCompany.id)
    }
  }, [selectedCompany, loadRecords])

  // Add or Rename Company
  const handleOpenCompanyModal = (company = null) => {
    if (company) {
      setEditingCompany(company)
      setCompanyNameInput(company.name)
    } else {
      setEditingCompany(null)
      setCompanyNameInput('')
    }
    setCompaniesError(null)
    setShowCompanyModal(true)
  }

  const handleSaveCompany = async (e) => {
    e.preventDefault()
    if (!companyNameInput.trim()) return

    setSavingCompany(true)
    try {
      let res
      if (editingCompany) {
        res = await window.api.updateCompany({ id: editingCompany.id, name: companyNameInput.trim() })
      } else {
        res = await window.api.createCompany({ name: companyNameInput.trim() })
      }

      if (res.success) {
        await loadCompanies()
        if (selectedCompany && editingCompany && selectedCompany.id === editingCompany.id) {
          setSelectedCompany(res.data)
        }
        setShowCompanyModal(false)
      } else {
        setCompaniesError(res.error || 'Failed to save company')
      }
    } catch (err) {
      setCompaniesError(err.message)
    } finally {
      setSavingCompany(false)
    }
  }

  // Delete Company
  const handleDeleteCompany = async (company) => {
    if (!window.confirm(`Are you sure you want to delete "${company.name}"?\nThis will permanently delete all visa, insurance, and license records associated with this company.`)) return

    try {
      const res = await window.api.deleteCompany({ id: company.id })
      if (res.success) {
        if (selectedCompany && selectedCompany.id === company.id) {
          setSelectedCompany(null)
        }
        await loadCompanies()
      } else {
        alert(res.error || 'Failed to delete company')
      }
    } catch (err) {
      alert(err.message)
    }
  }

  // Record Actions (Visa, Health Insurance, etc.)
  const handleOpenRecordModal = (record = null) => {
    setRecordsError(null)
    if (record) {
      setEditingRecord(record)
      setRecordForm({
        employeeName: record.employeeName,
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
        employeeName: '',
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
    if (!selectedCompany) return

    setSavingRecord(true)
    try {
      const payload = {
        ...recordForm,
        companyId: selectedCompany.id,
        category: selectedCategory
      }

      let res
      if (editingRecord) {
        res = await window.api.updateCompanyRecord({ id: editingRecord.id, ...payload })
      } else {
        res = await window.api.createCompanyRecord(payload)
      }

      if (res.success) {
        await loadRecords(selectedCompany.id)
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
    if (!window.confirm(`Are you sure you want to delete this record for "${record.employeeName || record.documentNumber}"?`)) return

    try {
      const res = await window.api.deleteCompanyRecord({ id: record.id })
      if (res.success) {
        await loadRecords(selectedCompany.id)
      } else {
        alert(res.error || 'Failed to delete record')
      }
    } catch (err) {
      alert(err.message)
    }
  }

  // Filtered List of Companies
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase()))
  }, [companies, companySearch])

  // Filtered list of records for the active tab/category
  const filteredRecords = useMemo(() => {
    return records.filter(r => r.category === selectedCategory)
  }, [records, selectedCategory])

  // Render Employee Name Field Label based on Tab
  const getEmployeeFieldLabel = () => {
    switch (selectedCategory) {
      case 'Trade License':
        return 'Sponsor / Partner Name'
      case 'Health Insurance':
      case 'Visa':
        return 'Employee Name'
      default:
        return 'Holder / Contact Name'
    }
  }

  // Render Document Number Field Label based on Tab
  const getDocNumberLabel = () => {
    switch (selectedCategory) {
      case 'Trade License':
        return 'License Number'
      case 'Health Insurance':
        return 'Policy / Card Number'
      case 'Visa':
        return 'Visa File / UID Number'
      default:
        return 'Document Number'
    }
  }

  // Render Type Field Label based on Tab
  const getDocTypeLabel = () => {
    switch (selectedCategory) {
      case 'Trade License':
        return 'Authority / Registry (e.g. DED)'
      case 'Health Insurance':
        return 'Insurance Provider (e.g. Daman)'
      case 'Visa':
        return 'Visa Type (e.g. Work, Partner)'
      default:
        return 'Document Type / Issuing Body'
    }
  }

  return (
    <div className="company-management-container">
      {/* ─────────────────────────────────────────────────────────────
          1. COMPANY LIST VIEW (when no company selected)
          ───────────────────────────────────────────────────────────── */}
      {!selectedCompany ? (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <h1>Company Directory</h1>
              <p>Manage typing center partner companies and track visa/health insurance documents</p>
            </div>
            <div className="page-header-actions">
              <button className="btn-primary-glow" onClick={() => handleOpenCompanyModal()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <PlusIcon size={16} /> New Company
              </button>
            </div>
          </div>

          <div className="grid-container" style={{ marginTop: 20 }}>
            <div className="grid-toolbar">
              <div className="grid-toolbar-left">
                <h3>Registered Companies</h3>
                <span className="record-count">{filteredCompanies.length} companies</span>
              </div>
              <div className="grid-toolbar-right">
                <input
                  className="grid-filter-input"
                  type="text"
                  placeholder="Search companies..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                />
                <button className="btn-outline-subtle" onClick={loadCompanies} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RefreshIcon size={14} /> Refresh
                </button>
              </div>
            </div>

            <div className="admin-table-wrap">
              {loadingCompanies ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
                  <Spinner animation="border" variant="light" size="sm" />
                  <span style={{ color: 'var(--text-secondary)' }}>Loading companies...</span>
                </div>
              ) : filteredCompanies.length === 0 ? (
                <div className="admin-empty">
                  No companies found. Add a company to start managing its assets.
                </div>
              ) : (
                <Table className="admin-table">
                  <thead>
                    <tr>
                      <th>Company Name</th>
                      <th style={{ textAlign: 'center', width: 330 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map((c) => (
                      <tr key={c.id}>
                        <td style={{ verticalAlign: 'middle', fontWeight: 600, fontSize: '1.02rem', color: 'var(--text-primary)' }}>
                          <span style={{ marginRight: 10, color: 'var(--accent-primary)', display: 'inline-flex', verticalAlign: 'middle' }}>
                            <CompanyIcon size={18} />
                          </span>
                          <a href="#" className="company-link-name" onClick={(e) => { e.preventDefault(); setSelectedCompany(c); }} style={{ color: 'var(--text-primary)', textDecoration: 'none', verticalAlign: 'middle' }}>
                            {c.name}
                          </a>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                            <Button variant="outline-primary" size="sm" className="py-1 px-3 d-flex align-items-center gap-1" onClick={() => setSelectedCompany(c)}>
                              <FolderIcon size={14} /> Open Files
                            </Button>
                            <Button variant="outline-warning" size="sm" className="py-1 px-2 d-flex align-items-center gap-1" onClick={() => handleOpenCompanyModal(c)}>
                              <EditIcon size={14} /> Rename
                            </Button>
                            <Button variant="outline-danger" size="sm" className="py-1 px-2 d-flex align-items-center gap-1" onClick={() => handleDeleteCompany(c)}>
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
           2. COMPANY DETAILS SCREEN (with tabs: Insurance, Visa, etc.)
           ───────────────────────────────────────────────────────────── */
        <>
          <div className="page-header">
            <div className="page-header-left">
              <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); setSelectedCompany(null); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: 10, fontSize: '0.9rem', fontWeight: 600 }}>
                <BackIcon size={14} /> Back to Directory
              </a>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--accent-primary)', display: 'inline-flex' }}><CompanyIcon size={24} /></span> {selectedCompany.name}
              </h1>
              <p>Manage documents, visas, health insurance, and license details for this company</p>
            </div>
            <div className="page-header-actions" style={{ display: 'flex', gap: 10, alignSelf: 'flex-end' }}>
              <button className="btn-outline-subtle" onClick={() => handleOpenCompanyModal(selectedCompany)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <EditIcon size={14} /> Rename
              </button>
              <button className="btn-primary-glow" onClick={() => handleOpenRecordModal()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>{cat}</span>
                    </button>
                  ))}
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

            {/* Right Pane: Records list for selected category */}
            <div className="company-records-pane">
              <div className="grid-container" style={{ marginTop: 0 }}>
                <div className="grid-toolbar">
                  <div className="grid-toolbar-left" style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', marginRight: 8 }}>{getCategoryIcon(selectedCategory)}</span>
                    <h3 style={{ display: 'inline-flex', alignItems: 'center', margin: 0 }}>{selectedCategory} Entries</h3>
                    <span className="record-count">{filteredRecords.length} records</span>
                  </div>
                  <div className="grid-toolbar-right">
                    <button className="btn-outline-subtle" onClick={() => loadRecords(selectedCompany.id)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <RefreshIcon size={14} /> Refresh
                    </button>
                  </div>
                </div>

                <div className="admin-table-wrap">
                  {loadingRecords ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
                      <Spinner animation="border" variant="light" size="sm" />
                      <span style={{ color: 'var(--text-secondary)' }}>Loading company documents...</span>
                    </div>
                  ) : filteredRecords.length === 0 ? (
                    <div className="admin-empty" style={{ padding: '40px 20px', fontSize: '0.92rem' }}>
                      📄 No records added in <strong>{selectedCategory}</strong> yet. Click "+ Add {selectedCategory}" to insert your first record.
                    </div>
                  ) : (
                    <Table className="admin-table">
                      <thead>
                        <tr>
                          <th>{getEmployeeFieldLabel()}</th>
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
                              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.employeeName || '—'}</td>
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
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. COMPANY FORM MODAL (Add / Rename Company)
          ───────────────────────────────────────────────────────────── */}
      <Modal show={showCompanyModal} onHide={() => setShowCompanyModal(false)} centered contentClassName="modal-dark">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title>{editingCompany ? 'Rename Company' : 'New Company'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveCompany}>
          <Modal.Body>
            {companiesError && <Alert variant="danger">{companiesError}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Company Name <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter company name"
                value={companyNameInput}
                onChange={(e) => setCompanyNameInput(e.target.value)}
                required
                autoFocus
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowCompanyModal(false)} disabled={savingCompany}>Cancel</Button>
            <Button type="submit" className="btn-primary-glow" disabled={savingCompany || !companyNameInput.trim()} style={{ border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              {savingCompany ? <><Spinner animation="border" size="sm" className="me-2" />Saving...</> : <><SaveIcon size={14} /> Save</>}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          4. RECORD FORM MODAL (Add / Edit Visa, Insurance, License)
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
                <Form.Label>{getEmployeeFieldLabel()} <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="employeeName"
                  placeholder={`Enter ${getEmployeeFieldLabel().toLowerCase()}`}
                  value={recordForm.employeeName}
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
                  placeholder={`e.g. ${selectedCategory === 'Health Insurance' ? 'Daman' : selectedCategory === 'Visa' ? 'Employment Visa' : 'DED'}`}
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
                placeholder="e.g. Labor Card, Civil Defense, Municipality"
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
    </div>
  )
}
