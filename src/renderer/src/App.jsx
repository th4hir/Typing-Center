import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { AllCommunityModule, themeAlpine } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap'
import AdminSettings from './AdminSettings'
import DailyReport from './DailyReport'
import CardAccounts from './CardAccounts'

// ─── Custom AG Grid Dark Theme ──────────────────────────────
const darkTheme = themeAlpine.withParams({
  backgroundColor: '#1c1f2e',
  headerBackgroundColor: '#161922',
  oddRowBackgroundColor: 'rgba(22, 25, 34, 0.5)',
  rowHoverColor: '#252840',
  borderColor: '#2a2d40',
  headerTextColor: '#8b8fa3',
  textColor: '#e8eaf0',
  secondaryTextColor: '#8b8fa3',
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  rowHeight: 48,
  headerHeight: 44,
  cellHorizontalPadding: 16,
  rangeSelectionBorderColor: '#6c63ff',
  selectedRowBackgroundColor: 'rgba(108, 99, 255, 0.25)',
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
  govtPayment: 'Cash'
}

// ─── App Component ───────────────────────────────────────────
function App() {
  const gridRef = useRef(null)
  const [quickFilter, setQuickFilter] = useState('')
  const [currentPage, setCurrentPage] = useState('applications')

  // ── Shop config ──
  const [shopConfig, setShopConfig] = useState(null)
  const [showSetup, setShowSetup] = useState(false)
  const [setupName, setSetupName] = useState('')
  const [setupAddress, setSetupAddress] = useState('')
  const [setupPhone, setSetupPhone] = useState('')
  const [setupSaving, setSetupSaving] = useState(false)

  // ── Live data ──
  const [applications, setApplications] = useState([])
  const [services, setServices] = useState([])
  const [paymentCards, setPaymentCards] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  const shopName = shopConfig?.shopName || 'Typing Center'

  // ── Computed typing fee ──
  const typingFee = useMemo(() => {
    const charge = parseFloat(formData.serviceCharge) || 0
    const govt = parseFloat(formData.govtFee) || 0
    return Math.max(0, charge - govt)
  }, [formData.serviceCharge, formData.govtFee])

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

  useEffect(() => {
    loadShopConfig()
    loadApplications()
    loadServices()
    loadPaymentCards()
    loadCompanies()
  }, [loadShopConfig, loadApplications, loadServices, loadPaymentCards, loadCompanies])

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
        if (svc) updated.serviceCharge = String(svc.price)
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
      const comp = companies.find(c => c.id === parseInt(formData.companyId, 10))
      companyName = comp ? comp.name : ''
    }

    try {
      setSaving(true)
      const charge = parseFloat(formData.serviceCharge) || 0
      const govt = parseFloat(formData.govtFee) || 0
      const result = await window.api.createApplication({
        customerName: formData.customerName.trim(),
        phone: formData.phone.trim(),
        emiratesId: modalTab === 'company' ? companyName : formData.emiratesId.trim(),
        customerType: modalTab === 'company' ? 'Company' : 'Individual',
        serviceId: parseInt(formData.serviceId, 10),
        serviceCharge: charge,
        customerPayment: formData.customerPayment,
        govtFee: govt,
        govtPayment: formData.govtPayment,
        typingFee: Math.max(0, charge - govt)
      })
      if (result.success) {
        setShowModal(false)
        setFormData(emptyForm)
        setFormError(null)
        await loadApplications()
      } else { setFormError(result.error) }
    } catch (err) { setFormError(err.message) }
    finally { setSaving(false) }
  }, [formData, modalTab, companies, loadApplications])

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    setFormData(emptyForm)
    setFormError(null)
    setShowAddCompany(false)
    setNewCompanyName('')
  }, [])

  const handleOpenModal = useCallback(async () => {
    setShowModal(true)
    setModalTab('individual')
    setFormData(emptyForm)
    await loadServices()
    await loadPaymentCards()
    await loadCompanies()
  }, [loadServices, loadPaymentCards, loadCompanies])

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

  // ── Grid columns ──
  const columnDefs = useMemo(() => [
    { headerName: 'ID', field: 'id', width: 70, sortable: true, filter: true },
    { headerName: 'Customer', field: 'customerName', flex: 1.3, minWidth: 150, sortable: true, filter: true },
    { headerName: 'Type', field: 'customerType', width: 110, sortable: true, filter: true, cellRenderer: CustomerTypeRenderer },
    { headerName: 'Company / EID', field: 'emiratesId', flex: 1, minWidth: 130, sortable: true, filter: true },
    { headerName: 'Service', flex: 1, minWidth: 140, sortable: true, filter: true, valueGetter: (p) => p.data?.service?.name || '—' },
    { headerName: 'Charge', field: 'serviceCharge', width: 100, sortable: true, valueFormatter: (p) => p.value?.toFixed(2) },
    { headerName: 'Govt Fee', field: 'govtFee', width: 100, sortable: true, valueFormatter: (p) => p.value?.toFixed(2) },
    { headerName: 'Profit', field: 'typingFee', width: 90, sortable: true, valueFormatter: (p) => p.value?.toFixed(2), cellStyle: { color: '#34d399' } },
    { headerName: 'Cust. Paid', field: 'customerPayment', width: 110, sortable: true, filter: true },
    { headerName: 'Date', field: 'createdAt', width: 120, sortable: true, cellRenderer: DateRenderer },
    { headerName: 'Status', field: 'status', width: 120, sortable: true, filter: true, cellRenderer: StatusRenderer },
  ], [])

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
    if (page === 'applications') { loadApplications(); loadServices() }
  }, [loadApplications, loadServices])

  const navItems = [
    { icon: '📋', label: 'Applications', page: 'applications' },
    { icon: '📊', label: 'Daily Report', page: 'daily-report' },
    { icon: '💳', label: 'Card Accounts', page: 'card-accounts' },
    { icon: '⚙️', label: 'Admin Settings', page: 'settings' },
  ]

  // ── Render content ──
  const renderContent = () => {
    if (currentPage === 'settings') return <AdminSettings shopConfig={shopConfig} onShopConfigSaved={(cfg) => setShopConfig(cfg)} />
    if (currentPage === 'daily-report') return <DailyReport />
    if (currentPage === 'card-accounts') return <CardAccounts />

    return (
      <>
        <div className="page-header">
          <div className="page-header-left">
            <h1>Applications</h1>
            <p>Manage and track all customer service applications</p>
          </div>
          <div className="page-header-actions">
            <button className="btn-outline-subtle" id="btn-export">📥 Export</button>
            <button className="btn-primary-glow" id="btn-new-application" onClick={handleOpenModal}>➕ New Application</button>
          </div>
        </div>

        <div className="stat-cards">
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-icon">📋</div></div>
            <div className="stat-card-value">{stats.total}</div>
            <div className="stat-card-label">Total Applications</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-icon">💰</div></div>
            <div className="stat-card-value">{stats.totalCharge.toFixed(0)}</div>
            <div className="stat-card-label">Total Sales (AED)</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-icon">✅</div></div>
            <div className="stat-card-value">{stats.totalProfit.toFixed(0)}</div>
            <div className="stat-card-label">Total Profit (AED)</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-card-icon">⏳</div></div>
            <div className="stat-card-value">{stats.pending}</div>
            <div className="stat-card-label">Pending</div>
          </div>
        </div>

        {error && <Alert variant="danger" className="mb-3" dismissible onClose={() => setError(null)}><strong>Error:</strong> {error}</Alert>}

        <div className="grid-container">
          <div className="grid-toolbar">
            <div className="grid-toolbar-left">
              <h3>Customer Applications</h3>
              <span className="record-count">{applications.length} records</span>
            </div>
            <div className="grid-toolbar-right">
              <input className="grid-filter-input" type="text" placeholder="Filter records..." value={quickFilter} onChange={(e) => setQuickFilter(e.target.value)} />
              <button className="btn-outline-subtle" onClick={loadApplications}>🔄 Refresh</button>
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
                theme={darkTheme}
                modules={[AllCommunityModule]}
                rowData={applications}
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

  // ── Payment fields (shared between tabs) ──
  const renderPaymentSection = () => (
    <div className="modal-payment-section">
      <div className="modal-section-title">💰 Payment Details</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Form.Group>
          <Form.Label className="modal-field-label">Service Charge (AED)</Form.Label>
          <Form.Control type="number" step="0.01" min="0" name="serviceCharge" placeholder="0.00" value={formData.serviceCharge} onChange={handleInputChange} />
        </Form.Group>
        <Form.Group>
          <Form.Label className="modal-field-label">Govt Fee (AED)</Form.Label>
          <Form.Control type="number" step="0.01" min="0" name="govtFee" placeholder="0.00" value={formData.govtFee} onChange={handleInputChange} />
        </Form.Group>
        <Form.Group>
          <Form.Label className="modal-field-label">Typing Fee (Profit)</Form.Label>
          <Form.Control type="text" readOnly value={`AED ${typingFee.toFixed(2)}`} style={{ color: 'var(--success)', fontWeight: 600 }} />
        </Form.Group>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <Form.Group>
          <Form.Label className="modal-field-label">Customer Paid By</Form.Label>
          <Form.Select name="customerPayment" value={formData.customerPayment} onChange={handleInputChange}>
            <option value="Cash">💵 Cash</option>
            {paymentCards.map((c) => (<option key={c.id} value={c.bankName}>💳 {c.bankName}</option>))}
          </Form.Select>
        </Form.Group>
        <Form.Group>
          <Form.Label className="modal-field-label">Govt Paid By</Form.Label>
          <Form.Select name="govtPayment" value={formData.govtPayment} onChange={handleInputChange}>
            <option value="Cash">💵 Cash</option>
            {paymentCards.map((c) => (<option key={c.id} value={c.bankName}>💳 {c.bankName}</option>))}
          </Form.Select>
        </Form.Group>
      </div>
    </div>
  )

  return (
    <>
      <nav className="app-navbar">
        <a className="navbar-brand" href="#" onClick={(e) => { e.preventDefault(); handleNav('applications') }}>
          <span className="brand-icon">⌨️</span>
          {shopName}
        </a>
        <div className="navbar-actions">
          <div className="navbar-search">
            <span className="search-icon">🔍</span>
            <input id="global-search" type="text" placeholder="Search anything..." />
          </div>
          <button className="nav-icon-btn" id="btn-notifications" title="Notifications">🔔<span className="badge-dot" /></button>
          <div className="user-avatar" title="Admin User">AU</div>
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
          <Modal.Title><span style={{ marginRight: 8 }}>📝</span>New Application</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {/* Tab Switcher */}
            <div className="modal-tabs">
              <button type="button" className={`modal-tab ${modalTab === 'individual' ? 'active' : ''}`} onClick={() => handleTabSwitch('individual')}>
                👤 Individual
              </button>
              <button type="button" className={`modal-tab ${modalTab === 'company' ? 'active' : ''}`} onClick={() => handleTabSwitch('company')}>
                🏢 Company
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
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(optional)</span></Form.Label>
                    <Form.Control type="tel" name="phone" placeholder="05X XXX XXXX" value={formData.phone} onChange={handleInputChange} />
                  </Form.Group>
                </div>
                <Form.Group className="mb-3">
                  <Form.Label>Service <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                  <Form.Select name="serviceId" value={formData.serviceId} onChange={handleInputChange}>
                    <option value="">Select a service...</option>
                    {services.map((svc) => (
                      <option key={svc.id} value={svc.id}>{svc.name} — AED {svc.price.toFixed(2)} ({svc.category?.name})</option>
                    ))}
                  </Form.Select>
                </Form.Group>
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
                    <button type="button" className="btn-outline-subtle" style={{ whiteSpace: 'nowrap', padding: '6px 14px' }}
                      onClick={() => setShowAddCompany(!showAddCompany)}>
                      {showAddCompany ? '✕' : '+ Add'}
                    </button>
                  </div>
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
                    <button type="button" className="btn-primary-glow" style={{ padding: '6px 16px', border: 'none', whiteSpace: 'nowrap' }}
                      disabled={addingCompany || !newCompanyName.trim()} onClick={handleAddCompany}>
                      {addingCompany ? <Spinner animation="border" size="sm" /> : '✓ Save'}
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

                <Form.Group className="mb-3">
                  <Form.Label>Service <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                  <Form.Select name="serviceId" value={formData.serviceId} onChange={handleInputChange}>
                    <option value="">Select a service...</option>
                    {services.map((svc) => (
                      <option key={svc.id} value={svc.id}>{svc.name} — AED {svc.price.toFixed(2)} ({svc.category?.name})</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                {renderPaymentSection()}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={handleCloseModal} disabled={saving}>Cancel</Button>
            <Button type="submit" className="btn-primary-glow" disabled={saving || services.length === 0} style={{ border: 'none' }}>
              {saving ? <><Spinner animation="border" size="sm" className="me-2" />Saving...</> : '💾 Save Application'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ─── First-Time Setup Modal ─── */}
      <Modal show={showSetup} centered backdrop="static" keyboard={false} contentClassName="modal-dark">
        <Modal.Header><Modal.Title><span style={{ marginRight: 8 }}>🏢</span>Welcome — Shop Setup</Modal.Title></Modal.Header>
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
              {setupSaving ? <><Spinner animation="border" size="sm" className="me-2" />Saving...</> : '🚀 Start Using'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}

export default App
