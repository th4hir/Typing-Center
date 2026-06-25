import { useState, useEffect, useCallback, useMemo } from 'react'
import { Table, Modal, Button, Form, Spinner, Alert, Dropdown } from 'react-bootstrap'
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  RefreshIcon,
  FolderIcon,
  BackIcon,
  SaveIcon,
  SalesIcon,
  BillIcon,
  CardIcon,
  PlaneIcon
} from './Icons'
import { useTableColumns } from './useTableColumns'
import { exportToExcel, exportToPDF } from './exportHelper'

export default function TravelsLedger({
  parentApplications,
  parentSuppliers,
  parentCards,
  onNewApplication,
  onEditApplication
}) {
  const suppliersCols = useTableColumns('travels_suppliers', ['name', 'charged', 'paid', 'balance', 'actions'], {
    name: 'Travels / Entity Name',
    charged: 'Total Cost (Owed)',
    paid: 'Total Paid',
    balance: 'Outstanding Balance',
    actions: 'Actions'
  })

  const ledgerCols = useTableColumns('travels_ledger', ['supplier', 'date', 'person', 'price', 'ourFee', 'paid', 'runningBalance', 'profit', 'customerPaid', 'status', 'customerBalance', 'actions'], {
    supplier: 'Travels',
    date: 'Date',
    person: 'Person Name',
    price: 'Price',
    ourFee: 'Our Fee',
    paid: 'Paid',
    runningBalance: 'Balance',
    profit: 'Service Charge',
    customerPaid: 'Customer Paid',
    status: 'Status',
    customerBalance: 'Customer Balance',
    actions: 'Action'
  })
  const [entities, setEntities] = useState([])
  const [applications, setApplications] = useState([])
  const [payments, setPayments] = useState([])
  const [cards, setPaymentCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Sync state with parent props to avoid duplicate fetches and sync instantly
  useEffect(() => {
    if (parentApplications) setApplications(parentApplications)
  }, [parentApplications])

  useEffect(() => {
    if (parentSuppliers) {
      setEntities(parentSuppliers.filter(e => e.name !== 'N/A' && e.name.trim() !== ''))
    }
  }, [parentSuppliers])

  useEffect(() => {
    if (parentCards) setPaymentCards(parentCards.filter(c => c.isActive))
  }, [parentCards])

  // Ledger detail view
  const [selectedEntity, setSelectedEntity] = useState(null) // GovtEntity object

  // Payment Recording Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    entityName: '',
    amount: '',
    paymentMethod: 'Cash',
    notes: '',
    createdAt: new Date().toISOString().split('T')[0]
  })

  // Load Data
  const loadLedgerData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const entRes = await window.api.fetchTravelSuppliers()
      const appRes = await window.api.fetchApplications()
      const payRes = await window.api.fetchTravelPayments()
      const cardRes = await window.api.fetchPaymentCards()

      if (entRes.success && appRes.success && payRes.success && cardRes.success) {
        // We filter out entities named 'N/A' or empty as they don't represent suppliers
        setEntities(entRes.data.filter(e => e.name !== 'N/A' && e.name.trim() !== ''))
        setApplications(appRes.data)
        setPayments(payRes.data)
        setPaymentCards(cardRes.data.filter(c => c.isActive))
      } else {
        setError('Failed to fetch ledger accounts.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLedgerData()
  }, [loadLedgerData])

  // Summaries per Entity
  const entitySummaries = useMemo(() => {
    return entities.map(entity => {
      // 1. Calculate sum of govt fees from applications (including Rejected to keep in statement)
      const charged = applications
        .filter(a => a.govtEntity === entity.name)
        .reduce((sum, a) => sum + (a.govtFee || 0), 0)

      // 2. Calculate sum of immediate payments from applications
      const immediatePaid = applications
        .filter(a => a.govtEntity === entity.name)
        .reduce((sum, a) => sum + (a.govtPaid || 0), 0)

      // 3. Calculate sum of recorded bulk payments
      const bulkPaid = payments
        .filter(p => p.supplierName === entity.name)
        .reduce((sum, p) => sum + (p.amount || 0), 0)

      const paid = immediatePaid + bulkPaid
      const balance = charged - paid

      return {
        ...entity,
        charged,
        paid,
        balance
      }
    }).sort((a, b) => b.balance - a.balance) // Sort by highest outstanding balance owed
  }, [entities, applications, payments])

  // Selected Entity Ledger entries (combined applications & payments sorted chronologically)
  const ledgerEntries = useMemo(() => {
    if (!selectedEntity) return []

    // 1. Applications associated with this entity (Representing Cost / Govt Fee additions)
    const appEntries = applications
      .filter(a => a.govtEntity === selectedEntity.name)
      .map(a => ({
        id: `app-${a.id}`,
        type: 'Application',
        date: new Date(a.createdAt),
        travelsSupplier: selectedEntity.name,
        personName: a.customerName,
        price: a.govtFee || 0,
        ourFee: a.serviceCharge || 0,
        paid: a.govtPaid || 0,
        serviceCharge: a.typingFee !== undefined && a.typingFee !== null ? a.typingFee : ((a.serviceCharge || 0) - (a.govtFee || 0)),
        customerPaid: a.paidAmount !== undefined && a.paidAmount !== null ? a.paidAmount : (a.serviceCharge || 0),
        status: a.status === 'Completed' ? 'GIVEN' : a.status === 'Rejected' ? 'REJECTED' : 'PENDING',
        customerBalance: (a.serviceCharge || 0) - (a.paidAmount !== undefined && a.paidAmount !== null ? a.paidAmount : (a.serviceCharge || 0)),
        refId: a.id
      }))

    // 2. Payments recorded to this entity
    const payEntries = payments
      .filter(p => p.supplierName === selectedEntity.name)
      .map(p => ({
        id: `pay-${p.id}`,
        type: 'Payment',
        date: new Date(p.createdAt),
        travelsSupplier: selectedEntity.name,
        personName: `Paid via ${p.paymentMethod} ${p.notes ? `(${p.notes})` : ''}`,
        price: 0,
        ourFee: 0,
        paid: p.amount || 0,
        serviceCharge: 0,
        customerPaid: 0,
        status: '—',
        customerBalance: 0,
        refId: p.id
      }))

    // Combined list sorted ascending by date (oldest first)
    const combined = [...appEntries, ...payEntries].sort((a, b) => a.date - b.date)

    // Calculate running balance
    let currentBalance = 0
    return combined.map(entry => {
      currentBalance += (entry.price - entry.paid)
      return {
        ...entry,
        runningBalance: currentBalance
      }
    })
  }, [selectedEntity, applications, payments])

  // Summary Metrics for Active Entity Detail
  const selectedSummary = useMemo(() => {
    if (!selectedEntity) return { charged: 0, paid: 0, balance: 0 }
    const summary = entitySummaries.find(s => s.name === selectedEntity.name)
    return summary || { charged: 0, paid: 0, balance: 0 }
  }, [selectedEntity, entitySummaries])

  // Modal Open Handlers
  const handleOpenPaymentModal = (entityName = '') => {
    setPaymentForm({
      entityName: entityName || (entities[0]?.name || ''),
      amount: '',
      paymentMethod: 'Cash',
      notes: '',
      createdAt: new Date().toISOString().split('T')[0]
    })
    setShowPaymentModal(true)
  }

  const handleSavePayment = async (e) => {
    e.preventDefault()
    const amt = parseFloat(paymentForm.amount)
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid positive payout amount.')
      return
    }

    try {
      setSubmittingPayment(true)
      const res = await window.api.createTravelPayment({
        supplierName: paymentForm.entityName,
        amount: amt,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes.trim(),
        createdAt: paymentForm.createdAt ? new Date(paymentForm.createdAt).toISOString() : new Date().toISOString()
      })

      if (res.success) {
        await loadLedgerData()
        setShowPaymentModal(false)
      } else {
        alert(res.error || 'Failed to save payment.')
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmittingPayment(false)
    }
  }

  const handleDeletePayment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment entry from the ledger? This will increase the balance owed.')) return
    try {
      const res = await window.api.deleteTravelPayment({ id })
      if (res.success) {
        await loadLedgerData()
      } else {
        alert(res.error || 'Failed to delete payment.')
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const handleExportSuppliers = useCallback(async (format) => {
    let shopConfig = null
    try {
      const shopRes = await window.api.getShopConfig()
      if (shopRes.success) shopConfig = shopRes.data
    } catch (err) {
      console.error(err)
    }

    const headers = ['Supplier Name', 'Total Cost (Owed) (AED)', 'Total Paid (AED)', 'Outstanding Balance (AED)']
    const rows = entitySummaries.map(ent => [
      ent.name,
      ent.charged.toFixed(2),
      ent.paid.toFixed(2),
      ent.balance.toFixed(2)
    ])

    const title = 'Travel Suppliers Summary'
    const subtitle = `Printed on ${new Date().toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' })}`
    const defaultName = 'travel_suppliers_summary'

    if (format === 'excel') {
      const res = await exportToExcel(headers, rows, `${defaultName}.xls`)
      if (res.success) alert('Suppliers summary exported successfully!')
      else if (res.error !== 'Cancelled') alert(`Export failed: ${res.error}`)
    } else {
      const totalCharged = entitySummaries.reduce((sum, s) => sum + s.charged, 0)
      const totalPaid = entitySummaries.reduce((sum, s) => sum + s.paid, 0)
      const totalBalance = entitySummaries.reduce((sum, s) => sum + s.balance, 0)

      const summaryCards = [
        { label: 'Suppliers', value: String(entitySummaries.length) },
        { label: 'Total Cost Owed', value: `AED ${totalCharged.toFixed(2)}` },
        { label: 'Total Paid', value: `AED ${totalPaid.toFixed(2)}`, color: '#10b981' },
        { label: 'Total Balance Owed', value: `AED ${totalBalance.toFixed(2)}`, color: totalBalance > 0 ? '#ef4444' : '#10b981' }
      ]

      const res = await exportToPDF(shopConfig, title, subtitle, headers, rows, `${defaultName}.pdf`, summaryCards)
      if (res.success) alert('Suppliers summary exported successfully!')
      else if (res.error !== 'Cancelled') alert(`Export failed: ${res.error}`)
    }
  }, [entitySummaries])

  const handleExportLedger = useCallback(async (format) => {
    if (!selectedEntity) return
    let shopConfig = null
    try {
      const shopRes = await window.api.getShopConfig()
      if (shopRes.success) shopConfig = shopRes.data
    } catch (err) {
      console.error(err)
    }

    const headers = [
      'Date',
      'Person / Description',
      'Price (AED)',
      'Our Fee (AED)',
      'Paid (AED)',
      'Running Balance (AED)',
      'Service Charge (AED)',
      'Customer Paid (AED)',
      'Customer Balance (AED)',
      'Status'
    ]

    const rows = ledgerEntries.map(entry => [
      entry.date.toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' }),
      entry.personName,
      entry.price > 0 ? entry.price.toFixed(2) : '—',
      entry.ourFee > 0 ? entry.ourFee.toFixed(2) : '—',
      entry.paid > 0 ? entry.paid.toFixed(2) : '—',
      entry.runningBalance.toFixed(2),
      entry.serviceCharge > 0 ? entry.serviceCharge.toFixed(2) : '—',
      entry.customerPaid > 0 ? entry.customerPaid.toFixed(2) : '—',
      entry.customerBalance > 0 ? entry.customerBalance.toFixed(2) : '—',
      entry.status
    ])

    const title = `Travels Ledger: ${selectedEntity.name}`
    const subtitle = `Statement of Running Account`
    const defaultName = `${selectedEntity.name.replace(/[^a-zA-Z0-9]/g, '_')}_travels_ledger`

    if (format === 'excel') {
      const res = await exportToExcel(headers, rows, `${defaultName}.xls`)
      if (res.success) alert('Ledger exported successfully!')
      else if (res.error !== 'Cancelled') alert(`Export failed: ${res.error}`)
    } else {
      const summaryCards = [
        { label: 'Total Cost Owed', value: `AED ${selectedSummary.charged.toFixed(2)}` },
        { label: 'Total Paid', value: `AED ${selectedSummary.paid.toFixed(2)}`, color: '#10b981' },
        { label: 'Net Balance Owed', value: `AED ${selectedSummary.balance.toFixed(2)}`, color: selectedSummary.balance > 0 ? '#ef4444' : '#10b981' }
      ]

      const res = await exportToPDF(shopConfig, title, subtitle, headers, rows, `${defaultName}.pdf`, summaryCards)
      if (res.success) alert('Ledger exported successfully!')
      else if (res.error !== 'Cancelled') alert(`Export failed: ${res.error}`)
    }
  }, [selectedEntity, ledgerEntries, selectedSummary])

  return (
    <div className="travels-ledger-container">
      {/* ─────────────────────────────────────────────────────────────
          1. SUPPLIER ACCOUNTS LIST VIEW (when no entity selected)
          ───────────────────────────────────────────────────────────── */}
      {!selectedEntity ? (
        <>
          <div className="page-header">
            <div className="page-header-left">
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--accent-primary)', display: 'inline-flex' }}><PlaneIcon size={24} /></span> Travels
              </h1>
              <p>Track running accounts, accumulated govt fees, payments, and outstanding balances with travel suppliers</p>
            </div>
            <div className="page-header-actions" style={{ display: 'flex', gap: 10 }}>
              {onNewApplication && (
                <button
                  className="btn-outline-subtle"
                  onClick={() => onNewApplication()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <PlusIcon size={16} /> New Travels Application
                </button>
              )}
              <button
                className="btn-primary-glow"
                onClick={() => handleOpenPaymentModal()}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                disabled={entities.length === 0}
              >
                <PlusIcon size={16} /> Record Supplier Payment
              </button>
            </div>
          </div>

          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

          <div className="grid-container" style={{ marginTop: 20 }}>
            <div className="grid-toolbar">
              <div className="grid-toolbar-left">
                <h3>Supplier Balances Summary</h3>
                <span className="record-count">{entitySummaries.length} suppliers</span>
              </div>
              <div className="grid-toolbar-right" style={{ display: 'flex', gap: 10 }}>
                <Dropdown align="end" className="d-inline">
                  <Dropdown.Toggle as="button" className="btn-outline-subtle" id="btn-export-suppliers" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Export
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="dropdown-menu-dark">
                    <Dropdown.Item onClick={() => handleExportSuppliers('excel')}>
                      Export Excel (.xls)
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleExportSuppliers('pdf')}>
                      Export PDF (.pdf)
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
                <Dropdown align="end" className="d-inline">
                  <Dropdown.Toggle as="button" className="btn-outline-subtle" id="col-selector-dropdown-suppliers">
                    Columns
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="dropdown-menu-dark p-3" style={{ minWidth: 220 }}>
                    <h6 className="dropdown-header px-0 pt-0 pb-2 border-bottom text-start" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem' }}>Visible Columns</h6>
                    <div className="pt-2 d-flex flex-column gap-2" style={{ maxHeight: 250, overflowY: 'auto' }}>
                      {suppliersCols.colOrder.map((col) => (
                        <label key={col} className="d-flex align-items-center text-start" style={{ cursor: 'pointer', fontSize: '0.85rem', gap: 8, color: 'var(--text-primary)', fontWeight: 500, margin: 0, userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={suppliersCols.colVisible[col]}
                            onChange={() => suppliersCols.toggleColumn(col)}
                            style={{ cursor: 'pointer' }}
                          />
                          {suppliersCols.friendlyNames[col]}
                        </label>
                      ))}
                    </div>
                  </Dropdown.Menu>
                </Dropdown>
                <button className="btn-outline-subtle" onClick={loadLedgerData} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RefreshIcon size={14} /> Refresh
                </button>
              </div>
            </div>

            <div className="admin-table-wrap">
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
                  <Spinner animation="border" variant="light" size="sm" />
                  <span style={{ color: 'var(--text-secondary)' }}>Calculating balances...</span>
                </div>
              ) : entitySummaries.length === 0 ? (
                <div className="admin-empty">
                  No supplier accounts registered. Add travel entities in settings to track balances.
                </div>
              ) : (
                <Table className="admin-table">
                  <thead>
                    <tr>
                      {suppliersCols.colOrder.map((colId, index) => {
                        if (!suppliersCols.colVisible[colId]) return null;
                        const label = suppliersCols.friendlyNames[colId];
                        let style = { cursor: 'move', userSelect: 'none' };
                        if (colId === 'charged' || colId === 'paid' || colId === 'balance') {
                          style.textAlign = 'right';
                        } else if (colId === 'actions') {
                          style.textAlign = 'center';
                          style.width = '260px';
                        }
                        return (
                          <th
                            key={colId}
                            draggable
                            onDragStart={(e) => suppliersCols.handleDragStart(e, index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => suppliersCols.handleDrop(e, index)}
                            style={style}
                            title="Drag to rearrange column order"
                          >
                            {label}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {entitySummaries.map((ent) => (
                      <tr key={ent.id}>
                        {suppliersCols.colOrder.map((colId) => {
                          if (!suppliersCols.colVisible[colId]) return null;
                          switch (colId) {
                            case 'name':
                              return (
                                <td key={colId} style={{ verticalAlign: 'middle', fontWeight: 600, fontSize: '1.02rem', color: 'var(--text-primary)' }}>
                                  <span style={{ marginRight: 10, color: 'var(--accent-primary)', display: 'inline-flex', verticalAlign: 'middle' }}>
                                    <FolderIcon size={18} />
                                  </span>
                                  <a
                                    href="#"
                                    className="company-link-name"
                                    onClick={(e) => { e.preventDefault(); setSelectedEntity(ent); }}
                                    style={{ color: 'var(--text-primary)', textDecoration: 'none', verticalAlign: 'middle' }}
                                  >
                                    {ent.name}
                                  </a>
                                </td>
                              );
                            case 'charged':
                              return (
                                <td key={colId} style={{ verticalAlign: 'middle', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                  AED {ent.charged.toFixed(2)}
                                </td>
                              );
                            case 'paid':
                              return (
                                <td key={colId} style={{ verticalAlign: 'middle', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--success)' }}>
                                  AED {ent.paid.toFixed(2)}
                                </td>
                              );
                            case 'balance':
                              return (
                                <td key={colId} style={{ verticalAlign: 'middle', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: ent.balance > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                  AED {ent.balance.toFixed(2)}
                                </td>
                              );
                            case 'actions':
                              return (
                                <td key={colId}>
                                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                                    <Button variant="outline-primary" size="sm" className="py-1 px-3 d-flex align-items-center gap-1" onClick={() => setSelectedEntity(ent)}>
                                      <FolderIcon size={14} /> Open Ledger
                                    </Button>
                                    <Button variant="outline-success" size="sm" className="py-1 px-3 d-flex align-items-center gap-1" onClick={() => handleOpenPaymentModal(ent.name)}>
                                      <PlusIcon size={14} /> Record Payout
                                    </Button>
                                  </div>
                                </td>
                              );
                            default:
                              return null;
                          }
                        })}
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
           2. LEDGER TRANSACTION ACCOUNT SHEET VIEW (Excel-like Ledger)
           ───────────────────────────────────────────────────────────── */
        <>
          <div className="page-header">
            <div className="page-header-left">
              <a
                href="#"
                className="back-link"
                onClick={(e) => { e.preventDefault(); setSelectedEntity(null); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: 10, fontSize: '0.9rem', fontWeight: 600 }}
              >
                <BackIcon size={14} /> Back to Supplier List
              </a>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--accent-primary)', display: 'inline-flex' }}><PlaneIcon size={24} /></span> {selectedEntity.name} Ledger Account
              </h1>
              <p>Detailed running statement of all customer charges and payout transactions with {selectedEntity.name}</p>
            </div>
            <div className="page-header-actions" style={{ alignSelf: 'flex-end', display: 'flex', gap: 10 }}>
              {onNewApplication && (
                <button
                  className="btn-outline-subtle"
                  onClick={() => onNewApplication(selectedEntity.name)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <PlusIcon size={14} /> New Application
                </button>
              )}
              <button
                className="btn-primary-glow"
                onClick={() => handleOpenPaymentModal(selectedEntity.name)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <PlusIcon size={14} /> Record supplier payment
              </button>
            </div>
          </div>

          {/* Running Summaries Bar */}
          <div className="stat-cards" style={{ marginTop: 24 }}>
            <div className="stat-card">
              <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--text-secondary)' }}>
                <BillIcon size={24} />
              </div>
              <div className="stat-card-value">AED {selectedSummary.charged.toFixed(2)}</div>
              <div className="stat-card-label">Total to Pay to travels</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--success)' }}>
                <CardIcon size={24} />
              </div>
              <div className="stat-card-value">AED {selectedSummary.paid.toFixed(2)}</div>
              <div className="stat-card-label">Total Amount Paid</div>
            </div>

            <div className="stat-card" style={{ borderLeft: `4px solid ${selectedSummary.balance > 0 ? 'var(--danger)' : 'var(--success)'}` }}>
              <div className="stat-card-icon" style={{ display: 'inline-flex', color: selectedSummary.balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                <SalesIcon size={24} />
              </div>
              <div className="stat-card-value" style={{ color: selectedSummary.balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                AED {selectedSummary.balance.toFixed(2)}
              </div>
              <div className="stat-card-label">Net Balance Owed</div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="grid-container" style={{ marginTop: 32 }}>
            <div className="grid-toolbar">
              <div className="grid-toolbar-left">
                <h3>Statement of Running Account</h3>
                <span className="record-count">{ledgerEntries.length} transactions</span>
              </div>
              <div className="grid-toolbar-right" style={{ display: 'flex', gap: 10 }}>
                <Dropdown align="end" className="d-inline">
                  <Dropdown.Toggle as="button" className="btn-outline-subtle" id="btn-export-travel-ledger" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Export
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="dropdown-menu-dark">
                    <Dropdown.Item onClick={() => handleExportLedger('excel')}>
                      Export Excel (.xls)
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleExportLedger('pdf')}>
                      Export PDF (.pdf)
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
                <Dropdown align="end" className="d-inline">
                  <Dropdown.Toggle as="button" className="btn-outline-subtle" id="col-selector-dropdown-ledger">
                    Columns
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="dropdown-menu-dark p-3" style={{ minWidth: 220 }}>
                    <h6 className="dropdown-header px-0 pt-0 pb-2 border-bottom text-start" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem' }}>Visible Columns</h6>
                    <div className="pt-2 d-flex flex-column gap-2" style={{ maxHeight: 250, overflowY: 'auto' }}>
                      {ledgerCols.colOrder.map((col) => (
                        <label key={col} className="d-flex align-items-center text-start" style={{ cursor: 'pointer', fontSize: '0.85rem', gap: 8, color: 'var(--text-primary)', fontWeight: 500, margin: 0, userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={ledgerCols.colVisible[col]}
                            onChange={() => ledgerCols.toggleColumn(col)}
                            style={{ cursor: 'pointer' }}
                          />
                          {ledgerCols.friendlyNames[col]}
                        </label>
                      ))}
                    </div>
                  </Dropdown.Menu>
                </Dropdown>
                <button className="btn-outline-subtle" onClick={loadLedgerData} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RefreshIcon size={14} /> Refresh
                </button>
              </div>
            </div>

            <div className="admin-table-wrap">
              {ledgerEntries.length === 0 ? (
                <div className="admin-empty" style={{ padding: 40 }}>
                  No transaction ledger recorded for this supplier.
                </div>
              ) : (
                <Table className="admin-table">
                  <thead>
                    <tr>
                      {ledgerCols.colOrder.map((colId, index) => {
                        if (!ledgerCols.colVisible[colId]) return null;
                        const label = ledgerCols.friendlyNames[colId];
                        let style = { cursor: 'move', userSelect: 'none' };
                        if (colId === 'price' || colId === 'ourFee' || colId === 'paid' || colId === 'runningBalance' || colId === 'profit' || colId === 'customerPaid' || colId === 'customerBalance') {
                          style.textAlign = 'right';
                          style.width = colId === 'customerBalance' ? '120px' : colId === 'runningBalance' || colId === 'profit' ? '110px' : '100px';
                        } else if (colId === 'supplier') {
                          style.width = '140px';
                        } else if (colId === 'date') {
                          style.width = '110px';
                        } else if (colId === 'status') {
                          style.textAlign = 'center';
                          style.width = '100px';
                        } else if (colId === 'actions') {
                          style.textAlign = 'center';
                          style.width = '80px';
                        }
                        return (
                          <th
                            key={colId}
                            draggable
                            onDragStart={(e) => ledgerCols.handleDragStart(e, index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => ledgerCols.handleDrop(e, index)}
                            style={style}
                            title="Drag to rearrange column order"
                          >
                            {label}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((entry) => (
                      <tr key={entry.id} style={{ background: entry.type === 'Payment' ? 'rgba(52, 211, 153, 0.03)' : undefined }}>
                        {ledgerCols.colOrder.map((colId) => {
                          if (!ledgerCols.colVisible[colId]) return null;
                          switch (colId) {
                            case 'supplier':
                              return (
                                <td key={colId} style={{ verticalAlign: 'middle', fontWeight: 600 }}>
                                  {entry.travelsSupplier}
                                </td>
                              );
                            case 'date':
                              return (
                                <td key={colId} style={{ verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums' }}>
                                  {entry.date.toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                              );
                            case 'person':
                              return (
                                <td key={colId} style={{ verticalAlign: 'middle', fontWeight: entry.type === 'Payment' ? 600 : 400 }}>
                                  {entry.type === 'Payment' ? (
                                    <span className="text-success"><SalesIcon size={14} className="text-success me-1" />{entry.personName}</span>
                                  ) : (
                                    <span>{entry.personName}</span>
                                  )}
                                </td>
                              );
                            case 'price':
                              return (
                                <td key={colId} style={{ verticalAlign: 'middle', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                  {entry.price > 0 ? `AED ${entry.price.toFixed(2)}` : '—'}
                                </td>
                              );
                            case 'ourFee':
                              return (
                                <td key={colId} style={{ verticalAlign: 'middle', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                  {entry.ourFee > 0 ? `AED ${entry.ourFee.toFixed(2)}` : '—'}
                                </td>
                              );
                            case 'paid':
                              return (
                                <td key={colId} style={{ verticalAlign: 'middle', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: entry.paid > 0 ? 'var(--success)' : undefined }}>
                                  {entry.paid > 0 ? `AED ${entry.paid.toFixed(2)}` : '—'}
                                </td>
                              );
                            case 'runningBalance':
                              return (
                                <td key={colId} style={{ verticalAlign: 'middle', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: entry.runningBalance > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                  AED {entry.runningBalance.toFixed(2)}
                                </td>
                              );
                            case 'profit':
                              return (
                                <td key={colId} style={{ verticalAlign: 'middle', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: entry.serviceCharge > 0 ? '#34d399' : undefined }}>
                                  {entry.serviceCharge > 0 ? `AED ${entry.serviceCharge.toFixed(2)}` : '—'}
                                </td>
                              );
                            case 'customerPaid':
                              return (
                                <td key={colId} style={{ verticalAlign: 'middle', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                  {entry.customerPaid > 0 ? `AED ${entry.customerPaid.toFixed(2)}` : '—'}
                                </td>
                              );
                            case 'status':
                              return (
                                <td key={colId} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                  {entry.status === 'GIVEN' ? (
                                    <span style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block' }}>GIVEN</span>
                                  ) : entry.status === 'PENDING' ? (
                                    <span style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block' }}>PENDING</span>
                                  ) : entry.status === 'REJECTED' ? (
                                    <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block' }}>REJECTED</span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                  )}
                                </td>
                              );
                            case 'customerBalance':
                              return (
                                <td key={colId} style={{ verticalAlign: 'middle', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: entry.customerBalance > 0 ? 'var(--danger)' : undefined }}>
                                  {entry.customerBalance > 0 ? `AED ${entry.customerBalance.toFixed(2)}` : '—'}
                                </td>
                              );
                            case 'actions':
                              return (
                                <td key={colId} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                  {entry.type === 'Payment' ? (
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      style={{ padding: '3px 8px' }}
                                      onClick={() => handleDeletePayment(entry.refId)}
                                    >
                                      <TrashIcon size={12} />
                                    </Button>
                                  ) : (
                                    <div className="d-flex justify-content-center align-items-center gap-2">
                                      {onEditApplication && (
                                        <button
                                          className="btn-outline-subtle d-flex align-items-center justify-content-center"
                                          style={{ padding: '2px 8px', fontSize: '0.75rem', height: 26, minWidth: 50 }}
                                          onClick={() => onEditApplication(entry.refId)}
                                        >
                                          <EditIcon size={12} className="me-1" /> Edit
                                        </button>
                                      )}
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>App #{entry.refId}</span>
                                    </div>
                                  )}
                                </td>
                              );
                            default:
                              return null;
                          }
                        })}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. RECORD PAYMENT FORM MODAL
          ───────────────────────────────────────────────────────────── */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered contentClassName="modal-dark">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title>Record Supplier Payment</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSavePayment}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Supplier / Entity <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
              <Form.Select
                value={paymentForm.entityName}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, entityName: e.target.value }))}
                required
              >
                {entities.map(e => (
                  <option key={e.id} value={e.name}>{e.name}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Payment Date <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
              <Form.Control
                type="date"
                value={paymentForm.createdAt}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, createdAt: e.target.value }))}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Amount Paid (AED) <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                required
                autoFocus
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Paid From (Payment Method) <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
              <Form.Select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                required
              >
                <option value="Cash">Cash</option>
                {cards.map(c => (
                  <option key={c.id} value={c.bankName}>{c.bankName}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Notes / Reference</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Receipt # or cheque info"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowPaymentModal(false)} disabled={submittingPayment}>Cancel</Button>
            <Button
              type="submit"
              className="btn-primary-glow"
              disabled={submittingPayment || !paymentForm.amount || !paymentForm.entityName}
              style={{ border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {submittingPayment ? <Spinner animation="border" size="sm" /> : <><SaveIcon size={14} /> Record Payment</>}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
