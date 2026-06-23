import { useState, useEffect, useMemo } from 'react'
import { Table, Spinner, Alert } from 'react-bootstrap'
import {
  SalesIcon,
  BillIcon,
  FolderIcon,
  RefreshIcon,
  CompanyIcon,
  IndividualIcon,
  WarningIcon
} from './Icons'

export default function HomeDashboard({ applications = [], shopName = 'Typing Center', onNavigate, onOpenFolder }) {
  const [expiringDocs, setExpiringDocs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [errorDocs, setErrorDocs] = useState(null)

  // 1. Load Expiring Documents
  const loadExpiringDocs = async () => {
    setLoadingDocs(true)
    setErrorDocs(null)
    try {
      const res = await window.api.fetchExpiringDocuments()
      if (res.success) {
        setExpiringDocs(res.data)
      } else {
        setErrorDocs(res.error || 'Failed to load expiries')
      }
    } catch (err) {
      setErrorDocs(err.message)
    } finally {
      setLoadingDocs(false)
    }
  }

  useEffect(() => {
    loadExpiringDocs()
  }, [])

  // 2. Calculations for Receivables (To Receive)
  const stats = useMemo(() => {
    // To Receive: Customer payment is Credit and application status is not completed/rejected
    const creditApps = applications.filter(
      a => a.customerPayment === 'Credit' && a.status !== 'Completed' && a.status !== 'Rejected'
    )
    const toReceiveAmount = creditApps.reduce((s, a) => s + (a.serviceCharge || 0), 0)
    const toReceiveCount = creditApps.length

    // To be Paid Out: Application status is Pending or In Progress, and we pay government (govtPayment is not N/A)
    const pendingGovApps = applications.filter(
      a => (a.status === 'Pending' || a.status === 'In Progress') && a.govtPayment !== 'N/A'
    )
    const toBePaidAmount = pendingGovApps.reduce((s, a) => s + (a.govtFee || 0), 0)
    const toBePaidCount = pendingGovApps.length

    return {
      toReceiveAmount,
      toReceiveCount,
      toBePaidAmount,
      toBePaidCount
    }
  }, [applications])

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

  return (
    <div className="home-dashboard-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>{shopName} Dashboard</h1>
          <p>Real-time analytics, outstanding receivables, government payouts, and critical document alerts</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stat-cards" style={{ marginTop: 24, cursor: 'pointer' }}>
        {/* Card 1: To Receive */}
        <div className="stat-card" onClick={() => onNavigate('applications', 'credit')}>
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--success)' }}>
            <SalesIcon size={24} />
          </div>
          <div className="stat-card-value">AED {stats.toReceiveAmount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-card-label">To Receive (Credit Outstanding)</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {stats.toReceiveCount} pending customer payments
          </div>
        </div>

        {/* Card 2: To be Paid Out */}
        <div className="stat-card" onClick={() => onNavigate('applications', 'pending-govt')}>
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--warning)' }}>
            <BillIcon size={24} />
          </div>
          <div className="stat-card-value">AED {stats.toBePaidAmount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-card-label">To be Paid Out (Govt Outflow)</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {stats.toBePaidCount} pending government fees
          </div>
        </div>

        {/* Card 3: Expiries */}
        <div className="stat-card" onClick={() => {
          const tableElement = document.getElementById('expiries-explorer-section')
          if (tableElement) tableElement.scrollIntoView({ behavior: 'smooth' })
        }}>
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--danger)' }}>
            <FolderIcon size={24} />
          </div>
          <div className="stat-card-value">{expiringDocs.length}</div>
          <div className="stat-card-label">Expiring Documents</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Visas, insurance & licenses expiring soon
          </div>
        </div>
      </div>

      {/* Expiries Explorer Table */}
      <div id="expiries-explorer-section" className="grid-container" style={{ marginTop: 32 }}>
        <div className="grid-toolbar">
          <div className="grid-toolbar-left">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WarningIcon size={20} className="text-warning" /> Critical Document Expiries
            </h3>
            <span className="record-count">{expiringDocs.length} files expiring within 30 days</span>
          </div>
          <div className="grid-toolbar-right">
            <button className="btn-outline-subtle" onClick={loadExpiringDocs} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshIcon size={14} /> Refresh
            </button>
          </div>
        </div>

        <div className="admin-table-wrap">
          {loadingDocs ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
              <Spinner animation="border" variant="light" size="sm" />
              <span style={{ color: 'var(--text-secondary)' }}>Scanning database for expiries...</span>
            </div>
          ) : errorDocs ? (
            <Alert variant="danger" className="m-3">{errorDocs}</Alert>
          ) : expiringDocs.length === 0 ? (
            <div className="admin-empty" style={{ padding: 40 }}>
              🎉 Excellent! No files are expired or expiring within the next 30 days.
            </div>
          ) : (
            <Table className="admin-table">
              <thead>
                <tr>
                  <th>Client / Employee Name</th>
                  <th>Parent Directory</th>
                  <th>Directory Type</th>
                  <th>Document Category</th>
                  <th>Document Number</th>
                  <th>Expiry Date</th>
                  <th>Days Remaining</th>
                  <th style={{ textAlign: 'center', width: 160 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {expiringDocs.map((item) => {
                  const expiryInfo = getDaysLeftInfo(item.expiryDate)
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.clientName}</td>
                      <td>{item.parentName}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
                          {item.type === 'Company' ? (
                            <><CompanyIcon size={14} className="text-info" /> Company</>
                          ) : (
                            <><IndividualIcon size={14} className="text-primary" /> Individual</>
                          )}
                        </span>
                      </td>
                      <td>{item.category}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{item.documentNumber || '—'}</td>
                      <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td>
                        <span className={expiryInfo.cls}>{expiryInfo.text}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn-outline-subtle d-flex align-items-center gap-1 py-1 px-3"
                            style={{ fontSize: '0.82rem' }}
                            onClick={() => onOpenFolder(item.type, item.parentId)}
                          >
                            <FolderIcon size={12} /> Open Files
                          </button>
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
  )
}
