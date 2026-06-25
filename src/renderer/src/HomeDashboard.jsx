import { useState, useEffect, useMemo } from 'react'
import { Table, Spinner, Alert } from 'react-bootstrap'
import {
  SalesIcon,
  BillIcon,
  FolderIcon,
  RefreshIcon,
  CompanyIcon,
  IndividualIcon,
  WarningIcon,
  PlusIcon,
  SaveIcon,
  CardIcon
} from './Icons'

export default function HomeDashboard({
  applications = [],
  companies = [],
  individuals = [],
  shopName = 'Typing Center',
  onNavigate,
  onOpenFolder,
  onNewApplication
}) {
  const [expiringDocs, setExpiringDocs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [errorDocs, setErrorDocs] = useState(null)
  const [activeSection, setActiveSection] = useState('expiring-docs')

  const [accountsData, setAccountsData] = useState(null)
  const [loadingAccounts, setLoadingAccounts] = useState(true)

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

  // 1b. Load Accounts and liquid balances
  const loadAccountsData = async () => {
    setLoadingAccounts(true)
    try {
      const res = await window.api.getAccounts()
      if (res.success) {
        setAccountsData(res.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingAccounts(false)
    }
  }

  useEffect(() => {
    loadExpiringDocs()
    loadAccountsData()
  }, [])

  // 2. Calculations for Receivables (To Receive)
  const stats = useMemo(() => {
    // To Receive: Any application with a positive balance (outstanding amount) and not rejected
    const creditApps = applications.filter(
      a => a.balance > 0 && a.status !== 'Rejected'
    )

    // Split into Company and Individual
    const companyCreditApps = creditApps.filter(a => a.customerType === 'Company')
    const companyToReceiveAmount = companyCreditApps.reduce((s, a) => s + (a.balance || 0), 0)
    const negativeCompanyAdvanceSum = companies.reduce((sum, c) => {
      return sum + (c.advanceBalance < 0 ? Math.abs(c.advanceBalance) : 0)
    }, 0)
    const totalCompanyToReceive = companyToReceiveAmount + negativeCompanyAdvanceSum
    const negativeCompanyCount = companies.filter(c => c.advanceBalance < 0).length
    const companyToReceiveCount = companyCreditApps.length + negativeCompanyCount

    const individualCreditApps = creditApps.filter(a => a.customerType === 'Individual')
    const individualToReceiveAmount = individualCreditApps.reduce((s, a) => s + (a.balance || 0), 0)
    const negativeIndividualAdvanceSum = individuals.reduce((sum, i) => {
      return sum + (i.advanceBalance < 0 ? Math.abs(i.advanceBalance) : 0)
    }, 0)
    const totalIndividualToReceive = individualToReceiveAmount + negativeIndividualAdvanceSum
    const negativeIndividualCount = individuals.filter(i => i.advanceBalance < 0).length
    const individualToReceiveCount = individualCreditApps.length + negativeIndividualCount

    // To be Paid Out: Application status is Pending or In Progress, and we pay government (govtPayment is not N/A)
    const pendingGovApps = applications.filter(
      a => (a.status === 'Pending' || a.status === 'In Progress') && a.govtPayment !== 'N/A'
    )
    const toBePaidAmount = pendingGovApps.reduce((s, a) => s + (a.govtFee || 0), 0)
    const toBePaidCount = pendingGovApps.length

    return {
      companyToReceiveAmount: totalCompanyToReceive,
      companyToReceiveCount,
      individualToReceiveAmount: totalIndividualToReceive,
      individualToReceiveCount,
      toBePaidAmount,
      toBePaidCount
    }
  }, [applications, companies, individuals])

  const accountsStats = useMemo(() => {
    const balances = accountsData?.balances || {}
    const unsettledCardApps = accountsData?.unsettledCardApps || []

    const bankBal = balances['Bank']?.balance || 0
    const grossUnsettled = unsettledCardApps.reduce((sum, app) => sum + (app.paidAmount || 0), 0)

    const vahidKey = Object.keys(balances).find(k => k.toLowerCase().includes('vahid'))
    const vahidBal = vahidKey ? balances[vahidKey].balance : 0

    const najiKey = Object.keys(balances).find(k => k.toLowerCase().includes('naji'))
    const najiBal = najiKey ? balances[najiKey].balance : 0

    return {
      bankBalance: bankBal,
      unsettledGross: grossUnsettled,
      vahidBalance: vahidBal,
      vahidLabel: vahidKey || 'Vahid',
      najiBalance: najiBal,
      najiLabel: najiKey || 'Naji'
    }
  }, [accountsData])

  const selectedLedgerEntries = useMemo(() => {
    if (!accountsData?.ledger) return []
    let accName = ''
    if (activeSection === 'bank-ledger') accName = 'Bank'
    else if (activeSection === 'vahid-ledger') accName = accountsStats.vahidLabel
    else if (activeSection === 'naji-ledger') accName = accountsStats.najiLabel
    else return []

    const { applications, expenses, entityPayments, supplierPayments, transfers } = accountsData.ledger
    const list = []

    applications.forEach(a => {
      const isCustomerPay = a.customerPayment === accName ||
        ((a.customerPayment === 'Card' || a.customerPayment === 'Account Transfer' || a.customerPayment === 'Cheque') && a.receivingAccount === accName)

      if (isCustomerPay) {
        const amt = a.customerPayment === 'Card' && a.cardReceiptNet > 0 ? a.cardReceiptNet : a.paidAmount
        list.push({
          id: `app-in-${a.id}`,
          date: new Date(a.createdAt),
          description: `Application Receipt: ${a.customerName} - ${a.service?.name || 'Service'} (${a.customerPayment})`,
          inflow: amt,
          outflow: 0
        })
      }

      if (a.govtPayment === accName && a.govtFee > 0) {
        list.push({
          id: `app-out-${a.id}`,
          date: new Date(a.createdAt),
          description: `Govt Fee: ${a.customerName} - ${a.service?.name || 'Service'} (${a.govtEntity || 'Portal'})`,
          inflow: 0,
          outflow: a.govtFee
        })
      }
    })

    expenses.forEach(e => {
      if (e.paymentMethod === accName) {
        list.push({
          id: `exp-${e.id}`,
          date: new Date(e.createdAt),
          description: `Expense: ${e.description}`,
          inflow: 0,
          outflow: e.amount
        })
      }
    })

    entityPayments.forEach(p => {
      if (p.paymentMethod === accName) {
        list.push({
          id: `ent-${p.id}`,
          date: new Date(p.createdAt),
          description: `Govt Payment: ${p.entityName} ${p.notes ? `(${p.notes})` : ''}`,
          inflow: 0,
          outflow: p.amount
        })
      }
    })

    supplierPayments.forEach(p => {
      if (p.paymentMethod === accName) {
        list.push({
          id: `sup-${p.id}`,
          date: new Date(p.createdAt),
          description: `Travel Supplier Payment: ${p.supplierName} ${p.notes ? `(${p.notes})` : ''}`,
          inflow: 0,
          outflow: p.amount
        })
      }
    })

    transfers.forEach(t => {
      if (t.fromAccount === accName) {
        list.push({
          id: `transfer-out-${t.id}`,
          date: new Date(t.createdAt),
          description: `Transfer Out to ${t.toAccount} ${t.notes ? `(${t.notes})` : ''}`,
          inflow: 0,
          outflow: t.amount
        })
      }
      if (t.toAccount === accName) {
        list.push({
          id: `transfer-in-${t.id}`,
          date: new Date(t.createdAt),
          description: `Transfer In from ${t.fromAccount} ${t.notes ? `(${t.notes})` : ''}`,
          inflow: t.amount,
          outflow: 0
        })
      }
    })

    return list.sort((a, b) => b.date - a.date)
  }, [accountsData, activeSection, accountsStats])

  const unsettledCardApps = useMemo(() => {
    return accountsData?.unsettledCardApps || []
  }, [accountsData])


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

  // Memos for inline tables
  const companyDueApps = useMemo(() => {
    const apps = applications.filter(a => a.balance > 0 && a.status !== 'Rejected' && a.customerType === 'Company')
      .map(a => ({
        id: String(a.id),
        emiratesId: a.emiratesId, // company name is stored here in applications
        customerName: a.customerName, // contact person
        service: a.service,
        serviceCharge: a.serviceCharge,
        paidAmount: a.paidAmount,
        createdAt: a.createdAt,
        status: a.status
      }))

    const negativeCompanies = companies.filter(c => c.advanceBalance < 0)
      .map(c => ({
        id: `Overdraft`,
        emiratesId: c.name,
        customerName: '—',
        service: { name: 'Advance Overdraft' },
        serviceCharge: 0,
        paidAmount: c.advanceBalance, // negative value representing advance remaining
        createdAt: new Date(),
        status: 'Overdraft'
      }))

    return [...apps, ...negativeCompanies]
  }, [applications, companies])

  const individualDueApps = useMemo(() => {
    const apps = applications.filter(a => a.balance > 0 && a.status !== 'Rejected' && a.customerType === 'Individual')
      .map(a => ({
        id: String(a.id),
        customerName: a.customerName,
        phone: a.phone || '—',
        service: a.service,
        serviceCharge: a.serviceCharge,
        paidAmount: a.paidAmount,
        createdAt: a.createdAt,
        status: a.status
      }))

    const negativeIndividuals = individuals.filter(i => i.advanceBalance < 0)
      .map(i => ({
        id: `Overdraft`,
        customerName: i.name,
        phone: i.phone || '—',
        service: { name: 'Advance Overdraft' },
        serviceCharge: 0,
        paidAmount: i.advanceBalance, // negative
        createdAt: new Date(),
        status: 'Overdraft'
      }))

    return [...apps, ...negativeIndividuals]
  }, [applications, individuals])

  const pendingGovtApps = useMemo(() => {
    return applications.filter(
      a => (a.status === 'Pending' || a.status === 'In Progress') && a.govtPayment !== 'N/A'
    )
  }, [applications])

  const handleOpenFolderByName = (type, name) => {
    if (type === 'Company') {
      const comp = companies.find(c => c.name.toLowerCase().trim() === name.toLowerCase().trim())
      if (comp) {
        onOpenFolder('Company', comp.id)
      } else {
        alert(`Company "${name}" not found in directory.`)
      }
    } else if (type === 'Individual') {
      const ind = individuals.find(i => i.name.toLowerCase().trim() === name.toLowerCase().trim())
      if (ind) {
        onOpenFolder('Individual', ind.id)
      } else {
        alert(`Individual "${name}" not found in directory.`)
      }
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
        <div className="page-header-actions" style={{ display: 'flex', gap: 10, alignSelf: 'flex-end' }}>
          <button className="btn-primary-glow" onClick={onNewApplication} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <PlusIcon size={14} /> New Application
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stat-cards" style={{ marginTop: 24, cursor: 'pointer' }}>
        {/* Card 1: Due from Company */}
        <div className={`stat-card ${activeSection === 'credit-company' ? 'active' : ''}`} onClick={() => setActiveSection('credit-company')}>
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--success)' }}>
            <CompanyIcon size={24} />
          </div>
          <div className="stat-card-value">AED {stats.companyToReceiveAmount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-card-label">Due from Company</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {stats.companyToReceiveCount} pending company payments
          </div>
        </div>

        {/* Card 2: Due from Individual */}
        <div className={`stat-card ${activeSection === 'credit-individual' ? 'active' : ''}`} onClick={() => setActiveSection('credit-individual')}>
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--info)' }}>
            <IndividualIcon size={24} />
          </div>
          <div className="stat-card-value">AED {stats.individualToReceiveAmount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-card-label">Due from Individual</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {stats.individualToReceiveCount} pending individual customer payments
          </div>
        </div>

        {/* Card 3: To be Paid Out */}
        <div className={`stat-card ${activeSection === 'pending-govt' ? 'active' : ''}`} onClick={() => setActiveSection('pending-govt')}>
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--warning)' }}>
            <BillIcon size={24} />
          </div>
          <div className="stat-card-value">AED {stats.toBePaidAmount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-card-label">To be Paid Out (Govt Outflow)</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {stats.toBePaidCount} pending government fees
          </div>
        </div>

        {/* Card 4: Expiries */}
        <div className={`stat-card ${activeSection === 'expiring-docs' ? 'active' : ''}`} onClick={() => setActiveSection('expiring-docs')}>
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

      {/* Accounts & Cash Flow Cards */}
      <div style={{ marginTop: 28 }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>Accounts & Liquid Balances</h4>
        <div className="stat-cards" style={{ marginBottom: 0, cursor: 'pointer' }}>
          {/* Card 5: Bank Balance */}
          <div className={`stat-card ${activeSection === 'bank-ledger' ? 'active' : ''}`} onClick={() => setActiveSection('bank-ledger')}>
            <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--info)' }}>
              <CardIcon size={24} />
            </div>
            <div className="stat-card-value">
              {loadingAccounts ? (
                <Spinner animation="border" size="sm" variant="light" style={{ color: 'var(--text-secondary)' }} />
              ) : (
                `AED ${accountsStats.bankBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
            <div className="stat-card-label">Bank Balance</div>
          </div>

          {/* Card 6: Card Machine Unsettled Gross */}
          <div className={`stat-card ${activeSection === 'card-settlements' ? 'active' : ''}`} onClick={() => setActiveSection('card-settlements')}>
            <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--warning)' }}>
              <CardIcon size={24} />
            </div>
            <div className="stat-card-value" style={{ color: 'var(--warning)' }}>
              {loadingAccounts ? (
                <Spinner animation="border" size="sm" variant="light" style={{ color: 'var(--text-secondary)' }} />
              ) : (
                `AED ${accountsStats.unsettledGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
            <div className="stat-card-label">Card Machine (Unsettled Gross)</div>
          </div>

          {/* Card 7: Vahid Balance */}
          <div className={`stat-card ${activeSection === 'vahid-ledger' ? 'active' : ''}`} onClick={() => setActiveSection('vahid-ledger')}>
            <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--accent-primary)' }}>
              <CardIcon size={24} />
            </div>
            <div className="stat-card-value">
              {loadingAccounts ? (
                <Spinner animation="border" size="sm" variant="light" style={{ color: 'var(--text-secondary)' }} />
              ) : (
                `AED ${accountsStats.vahidBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
            <div className="stat-card-label">{accountsStats.vahidLabel} Balance</div>
          </div>

          {/* Card 8: Naji Balance */}
          <div className={`stat-card ${activeSection === 'naji-ledger' ? 'active' : ''}`} onClick={() => setActiveSection('naji-ledger')}>
            <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--accent-primary)' }}>
              <CardIcon size={24} />
            </div>
            <div className="stat-card-value">
              {loadingAccounts ? (
                <Spinner animation="border" size="sm" variant="light" style={{ color: 'var(--text-secondary)' }} />
              ) : (
                `AED ${accountsStats.najiBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
            <div className="stat-card-label">{accountsStats.najiLabel} Balance</div>
          </div>
        </div>
      </div>

      {/* Dynamic Detail Explorer Table */}
      <div id="dashboard-detail-section" className="grid-container" style={{ marginTop: 32 }}>
        <div className="grid-toolbar">
          <div className="grid-toolbar-left">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {activeSection === 'credit-company' && (
                <><CompanyIcon size={20} className="text-success" /> Outstanding Company Credits (To Receive)</>
              )}
              {activeSection === 'credit-individual' && (
                <><IndividualIcon size={20} className="text-info" /> Outstanding Individual Credits (To Receive)</>
              )}
              {activeSection === 'pending-govt' && (
                <><BillIcon size={20} className="text-warning" /> Pending Government Outflows (To be Paid)</>
              )}
              {activeSection === 'expiring-docs' && (
                <><WarningIcon size={20} className="text-danger" /> Critical Document Expiries</>
              )}
              {activeSection === 'bank-ledger' && (
                <><CardIcon size={20} className="text-info" /> Bank Account Ledger (History)</>
              )}
              {activeSection === 'card-settlements' && (
                <><CardIcon size={20} className="text-warning" /> Pending Card Machine Swipes</>
              )}
              {activeSection === 'vahid-ledger' && (
                <><CardIcon size={20} className="text-primary" /> {accountsStats.vahidLabel} Account Ledger</>
              )}
              {activeSection === 'naji-ledger' && (
                <><CardIcon size={20} className="text-primary" /> {accountsStats.najiLabel} Account Ledger</>
              )}
            </h3>
            <span className="record-count">
              {activeSection === 'credit-company' && `${companyDueApps.length} applications`}
              {activeSection === 'credit-individual' && `${individualDueApps.length} applications`}
              {activeSection === 'pending-govt' && `${pendingGovtApps.length} applications`}
              {activeSection === 'expiring-docs' && `${expiringDocs.length} files`}
              {activeSection === 'bank-ledger' && `${selectedLedgerEntries.length} transactions`}
              {activeSection === 'card-settlements' && `${unsettledCardApps.length} pending swipes`}
              {activeSection === 'vahid-ledger' && `${selectedLedgerEntries.length} transactions`}
              {activeSection === 'naji-ledger' && `${selectedLedgerEntries.length} transactions`}
            </span>
          </div>
          <div className="grid-toolbar-right">
            <button
              className="btn-outline-subtle"
              onClick={() => {
                if (activeSection === 'expiring-docs') loadExpiringDocs()
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={activeSection !== 'expiring-docs'}
            >
              <RefreshIcon size={14} /> Refresh
            </button>
          </div>
        </div>

        <div className="admin-table-wrap">
          {activeSection === 'expiring-docs' ? (
            loadingDocs ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
                <Spinner animation="border" variant="light" size="sm" />
                <span style={{ color: 'var(--text-secondary)' }}>Scanning database for expiries...</span>
              </div>
            ) : errorDocs ? (
              <Alert variant="danger" className="m-3">{errorDocs}</Alert>
            ) : expiringDocs.length === 0 ? (
              <div className="admin-empty" style={{ padding: 40 }}>
                <SaveIcon size={16} className="text-success me-2" /> Excellent! No files are expired or expiring within the next 30 days.
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
            )
          ) : activeSection === 'credit-company' ? (
            companyDueApps.length === 0 ? (
              <div className="admin-empty" style={{ padding: 40 }}>
                <SalesIcon size={16} className="text-success me-2" /> No outstanding company credit.
              </div>
            ) : (
              <Table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Company Name</th>
                    <th>Contact Person</th>
                    <th>Service</th>
                    <th style={{ textAlign: 'right' }}>Total Fee</th>
                    <th style={{ textAlign: 'right' }}>Paid Amount</th>
                    <th style={{ textAlign: 'right' }}>Due Balance</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center', width: 140 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {companyDueApps.map((a) => {
                    const balance = a.serviceCharge - a.paidAmount
                    return (
                      <tr key={a.id}>
                        <td>{a.id}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.emiratesId}</td>
                        <td>{a.customerName}</td>
                        <td>{a.service?.name || '—'}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.serviceCharge.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.paidAmount.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--danger)', fontWeight: 600 }}>{balance.toFixed(2)}</td>
                        <td>{new Date(a.createdAt).toLocaleDateString('en-AE', { day: '2-digit', month: 'short' })}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`status-badge ${a.status.toLowerCase().replace(/\s+/g, '-')}`}>{a.status}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn-outline-subtle d-flex align-items-center gap-1 py-1 px-3"
                              style={{ fontSize: '0.82rem' }}
                              onClick={() => handleOpenFolderByName('Company', a.emiratesId)}
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
            )
          ) : activeSection === 'credit-individual' ? (
            individualDueApps.length === 0 ? (
              <div className="admin-empty" style={{ padding: 40 }}>
                <SalesIcon size={16} className="text-success me-2" /> No outstanding individual customer credit.
              </div>
            ) : (
              <Table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Service</th>
                    <th style={{ textAlign: 'right' }}>Total Fee</th>
                    <th style={{ textAlign: 'right' }}>Paid Amount</th>
                    <th style={{ textAlign: 'right' }}>Due Balance</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center', width: 140 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {individualDueApps.map((a) => {
                    const balance = a.serviceCharge - a.paidAmount
                    return (
                      <tr key={a.id}>
                        <td>{a.id}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.customerName}</td>
                        <td>{a.phone || '—'}</td>
                        <td>{a.service?.name || '—'}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.serviceCharge.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.paidAmount.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--danger)', fontWeight: 600 }}>{balance.toFixed(2)}</td>
                        <td>{new Date(a.createdAt).toLocaleDateString('en-AE', { day: '2-digit', month: 'short' })}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`status-badge ${a.status.toLowerCase().replace(/\s+/g, '-')}`}>{a.status}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn-outline-subtle d-flex align-items-center gap-1 py-1 px-3"
                              style={{ fontSize: '0.82rem' }}
                              onClick={() => handleOpenFolderByName('Individual', a.customerName)}
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
            )
          ) : activeSection === 'pending-govt' ? (
            pendingGovtApps.length === 0 ? (
              <div className="admin-empty" style={{ padding: 40 }}>
                <SaveIcon size={16} className="text-success me-2" /> No pending government outflows.
              </div>
            ) : (
              <Table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer Name</th>
                    <th>Customer Type</th>
                    <th>Service</th>
                    <th style={{ textAlign: 'right' }}>Govt Fee</th>
                    <th>Govt Payment</th>
                    <th>Govt Entity</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingGovtApps.map((a) => (
                    <tr key={a.id}>
                      <td>{a.id}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.customerName}</td>
                      <td>
                        <span className={`customer-type-badge ${a.customerType.toLowerCase()}`}>{a.customerType}</span>
                      </td>
                      <td>{a.service?.name || '—'}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--warning)', fontWeight: 600 }}>{a.govtFee.toFixed(2)}</td>
                      <td>{a.govtPayment}</td>
                      <td>{a.govtEntity || '—'}</td>
                      <td>{new Date(a.createdAt).toLocaleDateString('en-AE', { day: '2-digit', month: 'short' })}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-badge ${a.status.toLowerCase().replace(/\s+/g, '-')}`}>{a.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )
          ) : activeSection === 'card-settlements' ? (
            unsettledCardApps.length === 0 ? (
              <div className="admin-empty" style={{ padding: 40 }}>
                <SaveIcon size={16} className="text-success me-2" /> All card swipes have been settled! No pending settlements.
              </div>
            ) : (
              <Table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer Name</th>
                    <th>Service</th>
                    <th style={{ textAlign: 'right' }}>Gross Swiped</th>
                  </tr>
                </thead>
                <tbody>
                  {unsettledCardApps.map((app) => (
                    <tr key={app.id}>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{new Date(app.createdAt).toLocaleDateString('en-GB')}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{app.customerName}</td>
                      <td>{app.service?.name || '—'}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>AED {app.paidAmount?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )
          ) : ['bank-ledger', 'vahid-ledger', 'naji-ledger'].includes(activeSection) ? (
            selectedLedgerEntries.length === 0 ? (
              <div className="admin-empty" style={{ padding: 40 }}>
                No ledger transactions found for this account.
              </div>
            ) : (
              <Table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Inflow (+)</th>
                    <th style={{ textAlign: 'right' }}>Outflow (-)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLedgerEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{entry.date.toLocaleDateString('en-GB')}</td>
                      <td style={{ color: 'var(--text-primary)' }}>{entry.description}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--success)', fontWeight: entry.inflow > 0 ? 600 : 400 }}>
                        {entry.inflow > 0 ? `+${entry.inflow.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--danger)', fontWeight: entry.outflow > 0 ? 600 : 400 }}>
                        {entry.outflow > 0 ? `-${entry.outflow.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )
          ) : null}
        </div>
      </div>
    </div>
  )
}
