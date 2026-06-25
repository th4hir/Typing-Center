import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Spinner, Alert, Table, Modal, Button, Form, Dropdown } from 'react-bootstrap'
import { CardIcon, SalesIcon, RefreshIcon, PlusIcon, CloseIcon, SaveIcon, EditIcon } from './Icons'
import { useTableColumns } from './useTableColumns'
import { exportToExcel, exportToPDF } from './exportHelper'

function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const fmt = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  return { startDate: fmt(start), endDate: fmt(end) }
}

function Accounts() {
  const accountsCols = useTableColumns('accounts_list', ['name', 'balance'], {
    name: 'Account / Card Name',
    balance: 'Net Balance'
  })

  const ledgerCols = useTableColumns('accounts_ledger', ['date', 'description', 'inflow', 'outflow', 'action'], {
    date: 'Date',
    description: 'Description',
    inflow: 'Inflow (+)',
    outflow: 'Outflow (-)',
    action: 'Action'
  })

  const settlementsCols = useTableColumns('card_settlements_list', ['date', 'grossAmount', 'netAmount', 'fee', 'settlementNote', 'actions'], {
    date: 'Date',
    grossAmount: 'Gross Paid (AED)',
    netAmount: 'Net Credited (AED)',
    fee: 'Machine Fee (AED)',
    settlementNote: 'Note',
    actions: 'Action'
  })

  const [startDate, setStartDate] = useState(() => getMonthRange().startDate)
  const [endDate, setEndDate] = useState(() => getMonthRange().endDate)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Selected account for ledger view (defaults to 'Cash')
  const [selectedAccount, setSelectedAccount] = useState('Cash')

  // Card settlements state
  const [settlementFilter, setSettlementFilter] = useState('pending')
  const [showSettleModal, setShowSettleModal] = useState(false)
  const [selectedSettleApp, setSelectedSettleApp] = useState(null)
  const [settledNetInput, setSettledNetInput] = useState('')
  const [settledAccInput, setSettledAccInput] = useState('Bank')
  const [settlementNoteInput, setSettlementNoteInput] = useState('')
  const [savingSettlement, setSavingSettlement] = useState(false)

  // Modals state
  const [showAddCardModal, setShowAddCardModal] = useState(false)
  const [newCardName, setNewCardName] = useState('')
  const [savingCard, setSavingCard] = useState(false)

  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferForm, setTransferForm] = useState({
    fromAccount: 'Cash',
    toAccount: '',
    amount: '',
    notes: '',
    createdAt: new Date().toISOString().substring(0, 10)
  })
  const [savingTransfer, setSavingTransfer] = useState(false)

  // Govt portal payment manual recording state
  const [govtEntities, setGovtEntities] = useState([])
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    entityName: '',
    customEntityName: '',
    amount: '',
    paymentMethod: 'Cash',
    notes: '',
    createdAt: new Date().toISOString().substring(0, 10)
  })
  const [savingPayment, setSavingPayment] = useState(false)

  // Load accounts data and ledger
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await window.api.getAccounts({ startDate, endDate })
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error)
      }

      const entRes = await window.api.fetchGovtEntities()
      if (entRes.success) {
        setGovtEntities(entRes.data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Get active cards list (excluding cash which is handled manually)
  const activeCards = useMemo(() => {
    if (!data?.cards) return []
    return data.cards.filter(c => c.isActive)
  }, [data])

  const cashBoxBalance = useMemo(() => {
    return data?.balances['Cash']?.balance || 0
  }, [data])

  const bankBalance = useMemo(() => {
    return data?.balances['Bank']?.balance || 0
  }, [data])

  const unsettledGross = useMemo(() => {
    if (!data?.unsettledCardApps) return 0
    return data.unsettledCardApps.reduce((sum, app) => sum + (app.paidAmount || 0), 0)
  }, [data])

  // Other active cards (excluding Cash and Bank)
  const otherActiveCards = useMemo(() => {
    if (!data?.cards) return []
    return data.cards.filter(c => c.isActive && c.bankName !== 'Bank')
  }, [data])

  const settledCardApps = useMemo(() => {
    if (!data?.ledger?.applications) return []
    return data.ledger.applications
      .filter(a => a.customerPayment === 'Card' && a.receivingAccount)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [data])

  // Compute detailed ledger for the selected account in the date range
  const ledgerEntries = useMemo(() => {
    if (!data?.ledger || !selectedAccount) return []
    const { applications, expenses, entityPayments, supplierPayments, transfers } = data.ledger
    const list = []

    const accName = selectedAccount

    // 1. Applications Inflows / Outflows
    applications.forEach(a => {
      // Customer Payment Inflows
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

      // Government Fee Outflows
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

    // 2. Expenses Outflows
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

    // 3. Government Portal Top-ups Outflows
    entityPayments.forEach(p => {
      if (p.paymentMethod === accName) {
        list.push({
          id: `ent-${p.id}`,
          date: new Date(p.createdAt),
          description: `Govt Payment: ${p.entityName} ${p.notes ? `(${p.notes})` : ''}`,
          inflow: 0,
          outflow: p.amount,
          isEntityPayment: true,
          paymentId: p.id
        })
      }
    })

    // 4. Travel Supplier Payments Outflows
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

    // 5. Account Transfers Inflows / Outflows
    transfers.forEach(t => {
      if (t.fromAccount === accName) {
        list.push({
          id: `transfer-out-${t.id}`,
          date: new Date(t.createdAt),
          description: `Transfer Out to ${t.toAccount} ${t.notes ? `(${t.notes})` : ''}`,
          inflow: 0,
          outflow: t.amount,
          isTransfer: true,
          transferId: t.id
        })
      }
      if (t.toAccount === accName) {
        list.push({
          id: `transfer-in-${t.id}`,
          date: new Date(t.createdAt),
          description: `Transfer In from ${t.fromAccount} ${t.notes ? `(${t.notes})` : ''}`,
          inflow: t.amount,
          outflow: 0,
          isTransfer: true,
          transferId: t.id
        })
      }
    })

    // Sort by date descending
    return list.sort((a, b) => b.date - a.date)
  }, [data, selectedAccount])

  // Save new card
  const handleCreateCard = async (e) => {
    e.preventDefault()
    if (!newCardName.trim()) return

    try {
      setSavingCard(true)
      const res = await window.api.createPaymentCard({
        bankName: newCardName.trim(),
        isPersonal: false
      })

      if (res.success) {
        setSuccessMsg(`Account/Card "${res.data.bankName}" created successfully!`)
        setNewCardName('')
        setShowAddCardModal(false)
        await loadData()
      } else {
        alert(res.error || 'Failed to create card.')
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingCard(false)
    }
  }

  // Save transfer
  const handleCreateTransfer = async (e) => {
    e.preventDefault()
    const amt = parseFloat(transferForm.amount)
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid positive transfer amount.')
      return
    }
    if (transferForm.fromAccount === transferForm.toAccount) {
      alert('Source and destination accounts must be different.')
      return
    }

    try {
      setSavingTransfer(true)
      const res = await window.api.createAccountTransfer({
        ...transferForm,
        amount: amt
      })

      if (res.success) {
        setSuccessMsg('Transfer recorded successfully!')
        setShowTransferModal(false)
        setTransferForm({
          fromAccount: 'Cash',
          toAccount: '',
          amount: '',
          notes: '',
          createdAt: new Date().toISOString().substring(0, 10)
        })
        await loadData()
      } else {
        alert(res.error || 'Failed to record transfer.')
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingTransfer(false)
    }
  }

  // Delete transfer
  const handleDeleteTransfer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transfer? This will reverse the balances.')) return
    try {
      const res = await window.api.deleteAccountTransfer({ id })
      if (res.success) {
        setSuccessMsg('Transfer deleted/reversed!')
        await loadData()
      } else {
        alert(res.error || 'Failed to delete transfer.')
      }
    } catch (err) {
      alert(err.message)
    }
  }

  // Record manual portal/card payment
  const handleCreatePayment = async (e) => {
    e.preventDefault()
    const amt = parseFloat(paymentForm.amount)
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid positive amount.')
      return
    }
    const finalEntityName = paymentForm.entityName === 'Other'
      ? paymentForm.customEntityName.trim()
      : paymentForm.entityName

    if (!finalEntityName.trim()) {
      alert('Please select or specify a government portal/entity.')
      return
    }

    try {
      setSavingPayment(true)
      const res = await window.api.createEntityPayment({
        entityName: finalEntityName.trim(),
        amount: amt,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes.trim(),
        createdAt: paymentForm.createdAt
      })

      if (res.success) {
        setSuccessMsg('Government portal/card payment recorded successfully!')
        setShowRecordPaymentModal(false)
        setPaymentForm({
          entityName: '',
          customEntityName: '',
          amount: '',
          paymentMethod: 'Cash',
          notes: '',
          createdAt: new Date().toISOString().substring(0, 10)
        })
        await loadData()
      } else {
        alert(res.error || 'Failed to record payment.')
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingPayment(false)
    }
  }

  // Delete manual portal/card payment
  const handleDeleteEntityPayment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment? This will reverse the balances.')) return
    try {
      const res = await window.api.deleteEntityPayment({ id })
      if (res.success) {
        setSuccessMsg('Payment deleted/reversed successfully!')
        await loadData()
      } else {
        alert(res.error || 'Failed to delete payment.')
      }
    } catch (err) {
      alert(err.message)
    }
  }

  // Open settle modal and populate fields
  const openSettleModal = (app) => {
    setSelectedSettleApp(app)
    setSettledNetInput(app.cardReceiptNet && app.cardReceiptNet > 0 ? String(app.cardReceiptNet) : String(app.paidAmount || 0))
    setSettledAccInput(app.receivingAccount || 'Bank')
    setSettlementNoteInput(app.settlementNote || '')
    setShowSettleModal(true)
  }

  // Handle saving settlement info
  const handleSaveSettlement = async (e) => {
    e.preventDefault()
    if (!selectedSettleApp) return

    const net = parseFloat(settledNetInput)
    if (isNaN(net) || net < 0) {
      alert('Please enter a valid positive net amount.')
      return
    }

    try {
      setSavingSettlement(true)
      const res = await window.api.settleCardTransaction({
        id: selectedSettleApp.id,
        cardReceiptNet: net,
        receivingAccount: settledAccInput,
        settlementNote: settlementNoteInput
      })

      if (res.success) {
        setSuccessMsg('Card transaction settled successfully!')
        setShowSettleModal(false)
        setSelectedSettleApp(null)
        await loadData()
      } else {
        alert(res.error || 'Failed to settle card transaction.')
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingSettlement(false)
    }
  }

  const handleExportSettlements = useCallback(async (format) => {
    let shopConfig = null
    try {
      const shopRes = await window.api.getShopConfig()
      if (shopRes.success) shopConfig = shopRes.data
    } catch (err) {
      console.error(err)
    }

    const isPending = settlementFilter === 'pending'
    const listToExport = isPending
      ? (data?.unsettledCardApps || [])
      : settledCardApps

    const headers = ['Date', 'Gross Paid (AED)', 'Net Credited (AED)', 'Machine Fee (AED)', 'Note']
    const rows = listToExport.map(app => {
      const gross = app.paidAmount || 0
      const net = app.cardReceiptNet || 0
      const fee = Math.max(0, gross - net)
      return [
        new Date(app.createdAt).toLocaleDateString('en-GB'),
        gross.toFixed(2),
        isPending ? '—' : net.toFixed(2),
        isPending ? '—' : fee.toFixed(2),
        (isPending ? '—' : app.settlementNote) || '—'
      ]
    })

    const title = `Card Machine Settlements (${isPending ? 'Pending' : 'Settled'})`
    const subtitle = `Date Range: ${new Date(startDate).toLocaleDateString('en-AE')} to ${new Date(endDate).toLocaleDateString('en-AE')}`
    const defaultName = `card_settlements_${settlementFilter}_${startDate}_to_${endDate}`

    if (format === 'excel') {
      const res = await exportToExcel(headers, rows, `${defaultName}.xls`)
      if (res.success) alert('Settlements exported successfully!')
      else if (res.error !== 'Cancelled') alert(`Export failed: ${res.error}`)
    } else {
      const grossSum = listToExport.reduce((sum, app) => sum + (app.paidAmount || 0), 0)
      const netSum = isPending ? 0 : listToExport.reduce((sum, app) => sum + (app.cardReceiptNet || 0), 0)
      const feeSum = isPending ? 0 : Math.max(0, grossSum - netSum)

      const summaryCards = isPending ? [
        { label: 'Pending Swipes', value: String(listToExport.length) },
        { label: 'Total Gross Pending', value: `AED ${grossSum.toFixed(2)}`, color: '#f59e0b' }
      ] : [
        { label: 'Settled Swipes', value: String(listToExport.length) },
        { label: 'Total Gross Paid', value: `AED ${grossSum.toFixed(2)}` },
        { label: 'Total Net Credited', value: `AED ${netSum.toFixed(2)}`, color: '#10b981' },
        { label: 'Total Fees Charged', value: `AED ${feeSum.toFixed(2)}`, color: '#ef4444' }
      ]

      const res = await exportToPDF(shopConfig, title, subtitle, headers, rows, `${defaultName}.pdf`, summaryCards)
      if (res.success) alert('Settlements exported successfully!')
      else if (res.error !== 'Cancelled') alert(`Export failed: ${res.error}`)
    }
  }, [data, settlementFilter, settledCardApps, startDate, endDate])

  const handleExportLedger = useCallback(async (format) => {
    let shopConfig = null
    try {
      const shopRes = await window.api.getShopConfig()
      if (shopRes.success) shopConfig = shopRes.data
    } catch (err) {
      console.error(err)
    }

    const headers = ['Date', 'Description', 'Inflow (+)', 'Outflow (-)']
    const sortedEntries = [...ledgerEntries].reverse()

    const rows = sortedEntries.map(entry => [
      entry.date.toLocaleDateString('en-GB'),
      entry.description,
      entry.inflow > 0 ? entry.inflow.toFixed(2) : '—',
      entry.outflow > 0 ? entry.outflow.toFixed(2) : '—'
    ])

    const title = `Account Ledger: ${selectedAccount}`
    const subtitle = `Date Range: ${new Date(startDate).toLocaleDateString('en-AE')} to ${new Date(endDate).toLocaleDateString('en-AE')}`
    const defaultName = `${selectedAccount.replace(/[^a-zA-Z0-9]/g, '_')}_ledger_${startDate}_to_${endDate}`

    if (format === 'excel') {
      const res = await exportToExcel(headers, rows, `${defaultName}.xls`)
      if (res.success) alert('Ledger exported successfully!')
      else if (res.error !== 'Cancelled') alert(`Export failed: ${res.error}`)
    } else {
      const totalInflow = ledgerEntries.reduce((sum, e) => sum + e.inflow, 0)
      const totalOutflow = ledgerEntries.reduce((sum, e) => sum + e.outflow, 0)
      const netChange = totalInflow - totalOutflow

      const summaryCards = [
        { label: 'Transactions', value: String(ledgerEntries.length) },
        { label: 'Total Inflow (+)', value: `AED ${totalInflow.toFixed(2)}`, color: '#10b981' },
        { label: 'Total Outflow (-)', value: `AED ${totalOutflow.toFixed(2)}`, color: '#ef4444' },
        { label: 'Net Change', value: `${netChange >= 0 ? '+' : ''}AED ${netChange.toFixed(2)}`, color: netChange >= 0 ? '#10b981' : '#ef4444' }
      ]

      const res = await exportToPDF(shopConfig, title, subtitle, headers, rows, `${defaultName}.pdf`, summaryCards)
      if (res.success) alert('Ledger exported successfully!')
      else if (res.error !== 'Cancelled') alert(`Export failed: ${res.error}`)
    }
  }, [ledgerEntries, selectedAccount, startDate, endDate])

  return (
    <div className="card-accounts">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--accent-primary)', display: 'inline-flex' }}><CardIcon size={24} /></span> Accounts & Cash Flow
          </h1>
          <p>Track balances, bank transfers, cash withdrawals, and ledger entries</p>
        </div>
        <div className="page-header-actions" style={{ gap: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn-outline-subtle d-flex align-items-center gap-1" onClick={() => setShowAddCardModal(true)}>
            <PlusIcon size={14} /> Add Card/Account
          </button>
          <button className="btn-outline-subtle d-flex align-items-center gap-1 text-warning border-warning" style={{ borderColor: 'rgba(251, 191, 36, 0.3)' }} onClick={() => {
            // Default to Cash or first card
            setPaymentForm(prev => ({
              ...prev,
              paymentMethod: selectedAccount !== 'Cash' ? selectedAccount : 'Cash'
            }))
            setShowRecordPaymentModal(true)
          }}>
            <PlusIcon size={14} /> Record Portal/Card Payment
          </button>
          <button className="btn-primary-glow d-flex align-items-center gap-1" style={{ border: 'none' }} onClick={() => {
            // Set initial defaults for dropdowns if options available
            const defaultTo = activeCards.length > 0 ? activeCards[0].bankName : ''
            setTransferForm(prev => ({ ...prev, toAccount: defaultTo }))
            setShowTransferModal(true)
          }}>
            <SalesIcon size={14} /> Transfer Money
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="stat-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 20 }}>
        {/* Cash Box */}
        <div
          className="stat-card"
          style={{
            cursor: 'pointer',
            border: selectedAccount === 'Cash' ? '1px solid var(--accent-primary)' : '1px solid transparent',
            transition: 'border-color 0.2s'
          }}
          onClick={() => setSelectedAccount('Cash')}
        >
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--success)' }}>
            <SalesIcon size={24} />
          </div>
          <div className="stat-card-value">AED {cashBoxBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-card-label">Cash Box Balance</div>
        </div>

        {/* Bank Balance */}
        <div
          className="stat-card"
          style={{
            cursor: 'pointer',
            border: selectedAccount === 'Bank' ? '1px solid var(--accent-primary)' : '1px solid transparent',
            transition: 'border-color 0.2s'
          }}
          onClick={() => setSelectedAccount('Bank')}
        >
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--info)' }}>
            <CardIcon size={24} />
          </div>
          <div className="stat-card-value">AED {bankBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-card-label">Bank Balance</div>
        </div>

        {/* Card Machine Unsettled Gross */}
        <div className="stat-card" style={{ border: '1px solid transparent' }}>
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--warning)' }}>
            <CardIcon size={24} />
          </div>
          <div className="stat-card-value text-warning">AED {unsettledGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-card-label">Card Machine (Unsettled Gross)</div>
        </div>

        {/* Other active cards */}
        {otherActiveCards.map(c => {
          const bal = data?.balances[c.bankName]?.balance || 0
          return (
            <div
              key={c.id}
              className="stat-card"
              style={{
                cursor: 'pointer',
                border: selectedAccount === c.bankName ? '1px solid var(--accent-primary)' : '1px solid transparent',
                transition: 'border-color 0.2s'
              }}
              onClick={() => setSelectedAccount(c.bankName)}
            >
              <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--accent-primary)' }}>
                <CardIcon size={24} />
              </div>
              <div className="stat-card-value">AED {bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="stat-card-label">{c.bankName} Balance</div>
            </div>
          )
        })}
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3"
          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          {error}
        </Alert>
      )}

      {successMsg && (
        <Alert variant="success" dismissible onClose={() => setSuccessMsg(null)} className="mb-3"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--success)', fontSize: '0.85rem' }}>
          {successMsg}
        </Alert>
      )}

      {/* Main Section Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 20 }}>

        {/* Left Column: Accounts List */}
        <div className="grid-container">
          <div className="grid-toolbar">
            <div className="grid-toolbar-left"><h3>Active Accounts</h3></div>
            <div className="grid-toolbar-right" style={{ display: 'flex', gap: 10 }}>
              <Dropdown align="end" className="d-inline">
                <Dropdown.Toggle as="button" className="btn-outline-subtle" id="col-selector-dropdown-accounts">
                  Columns
                </Dropdown.Toggle>
                <Dropdown.Menu className="dropdown-menu-dark p-3" style={{ minWidth: 200 }}>
                  <h6 className="dropdown-header px-0 pt-0 pb-2 border-bottom text-start" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem' }}>Visible Columns</h6>
                  <div className="pt-2 d-flex flex-column gap-2" style={{ maxHeight: 250, overflowY: 'auto' }}>
                    {accountsCols.colOrder.map((col) => (
                      <label key={col} className="d-flex align-items-center text-start" style={{ cursor: 'pointer', fontSize: '0.85rem', gap: 8, color: 'var(--text-primary)', fontWeight: 500, margin: 0, userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={accountsCols.colVisible[col]}
                          onChange={() => accountsCols.toggleColumn(col)}
                          style={{ cursor: 'pointer' }}
                        />
                        {accountsCols.friendlyNames[col]}
                      </label>
                    ))}
                  </div>
                </Dropdown.Menu>
              </Dropdown>
              <button className="btn-outline-subtle" onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshIcon size={14} /> Refresh
              </button>
            </div>
          </div>

          {loading && !data ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 50, gap: 10 }}>
              <Spinner animation="border" variant="light" size="sm" />
              <span style={{ color: 'var(--text-secondary)' }}>Loading Accounts...</span>
            </div>
          ) : data ? (
            <div className="admin-table-wrap">
              <Table className="admin-table hoverable">
                <thead>
                  <tr>
                    {accountsCols.colOrder.map((colId, index) => {
                      if (!accountsCols.colVisible[colId]) return null
                      const label = accountsCols.friendlyNames[colId]
                      let style = { cursor: 'move', userSelect: 'none' }
                      if (colId === 'balance') {
                        style.textAlign = 'right'
                      }
                      return (
                        <th
                          key={colId}
                          draggable
                          onDragStart={(e) => accountsCols.handleDragStart(e, index)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => accountsCols.handleDrop(e, index)}
                          style={style}
                          title="Drag to rearrange column order"
                        >
                          {label}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Cash Box row */}
                  <tr
                    style={{
                      cursor: 'pointer',
                      background: selectedAccount === 'Cash' ? 'var(--bg-sidebar-active)' : '',
                      color: selectedAccount === 'Cash' ? 'var(--text-sidebar-active)' : ''
                    }}
                    onClick={() => setSelectedAccount('Cash')}
                  >
                    {accountsCols.colOrder.map((colId) => {
                      if (!accountsCols.colVisible[colId]) return null
                      if (colId === 'name') {
                        return (
                          <td key={colId}>
                            <span className="fw-bold">Cash Box</span>
                          </td>
                        )
                      }
                      if (colId === 'balance') {
                        const cashBal = data.balances['Cash']?.balance || 0
                        return (
                          <td key={colId} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: cashBal >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            AED {cashBal.toFixed(2)}
                          </td>
                        )
                      }
                      return null
                    })}
                  </tr>

                  {/* Payment Card rows */}
                  {data.cards.map((card) => {
                    const bal = data.balances[card.bankName]?.balance || 0
                    const isSelected = selectedAccount === card.bankName
                    return (
                      <tr
                        key={card.id}
                        style={{
                          cursor: 'pointer',
                          background: isSelected ? 'var(--bg-sidebar-active)' : '',
                          color: isSelected ? 'var(--text-sidebar-active)' : ''
                        }}
                        onClick={() => setSelectedAccount(card.bankName)}
                      >
                        {accountsCols.colOrder.map((colId) => {
                          if (!accountsCols.colVisible[colId]) return null
                          if (colId === 'name') {
                            return (
                              <td key={colId}>
                                <span className={card.isActive ? '' : 'text-muted'}>{card.bankName}</span>
                                {!card.isActive && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 6 }}>(Inactive)</span>}
                              </td>
                            )
                          }
                          if (colId === 'balance') {
                            return (
                              <td key={colId} style={{
                                textAlign: 'right',
                                fontVariantNumeric: 'tabular-nums',
                                fontWeight: 600,
                                color: bal >= 0 ? 'var(--success)' : 'var(--danger)'
                              }}>
                                AED {bal.toFixed(2)}
                              </td>
                            )
                          }
                          return null
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>
          ) : null}
        </div>

        {/* Right Column: Card Machine Settlements */}
        <div className="grid-container">
          <div className="grid-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="grid-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CardIcon size={20} style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ margin: 0 }}>Card Machine Settlements</h3>
            </div>
            <div className="grid-toolbar-right" style={{ gap: 12, display: 'flex', alignItems: 'center' }}>
              {/* Filter Tabs */}
              <div className="d-flex" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 2 }}>
                <button
                  type="button"
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.78rem',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    background: settlementFilter === 'pending' ? 'var(--accent-primary)' : 'transparent',
                    color: settlementFilter === 'pending' ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: 600,
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => setSettlementFilter('pending')}
                >
                  Pending ({data?.unsettledCardApps?.length || 0})
                </button>
                <button
                  type="button"
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.78rem',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    background: settlementFilter === 'settled' ? 'var(--accent-primary)' : 'transparent',
                    color: settlementFilter === 'settled' ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: 600,
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => setSettlementFilter('settled')}
                >
                  Settled ({settledCardApps.length})
                </button>
              </div>

              <Dropdown align="end" className="d-inline">
                <Dropdown.Toggle as="button" className="btn-outline-subtle" id="btn-export-settlements" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Export
                </Dropdown.Toggle>
                <Dropdown.Menu className="dropdown-menu-dark">
                  <Dropdown.Item onClick={() => handleExportSettlements('excel')}>
                    Export Excel (.xls)
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleExportSettlements('pdf')}>
                    Export PDF (.pdf)
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              <Dropdown align="end" className="d-inline">
                <Dropdown.Toggle as="button" className="btn-outline-subtle" id="col-selector-dropdown-settlements">
                  Columns
                </Dropdown.Toggle>
                <Dropdown.Menu className="dropdown-menu-dark p-3" style={{ minWidth: 200 }}>
                  <h6 className="dropdown-header px-0 pt-0 pb-2 border-bottom text-start" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem' }}>Visible Columns</h6>
                  <div className="pt-2 d-flex flex-column gap-2" style={{ maxHeight: 250, overflowY: 'auto' }}>
                    {settlementsCols.colOrder.map((col) => (
                      <label key={col} className="d-flex align-items-center text-start" style={{ cursor: 'pointer', fontSize: '0.85rem', gap: 8, color: 'var(--text-primary)', fontWeight: 500, margin: 0, userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={settlementsCols.colVisible[col]}
                          onChange={() => settlementsCols.toggleColumn(col)}
                          style={{ cursor: 'pointer' }}
                        />
                        {settlementsCols.friendlyNames[col]}
                      </label>
                    ))}
                  </div>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>

          <div className="admin-table-wrap" style={{ maxHeight: 350, overflowX: 'auto' }}>
            <Table className="admin-table hoverable">
              <thead>
                <tr>
                  {settlementsCols.colOrder.map((colId, index) => {
                    if (!settlementsCols.colVisible[colId]) return null
                    const label = settlementsCols.friendlyNames[colId]
                    let style = { cursor: 'move', userSelect: 'none' }
                    if (colId === 'grossAmount' || colId === 'netAmount' || colId === 'fee') {
                      style.textAlign = 'right'
                    } else if (colId === 'actions') {
                      style.textAlign = 'center'
                    }
                    return (
                      <th
                        key={colId}
                        draggable
                        onDragStart={(e) => settlementsCols.handleDragStart(e, index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => settlementsCols.handleDrop(e, index)}
                        style={style}
                        title="Drag to rearrange column order"
                      >
                        {label}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {settlementFilter === 'pending' ? (
                  !data?.unsettledCardApps || data.unsettledCardApps.length === 0 ? (
                    <tr>
                      <td colSpan={settlementsCols.colOrder.filter(c => settlementsCols.colVisible[c]).length} className="admin-empty" style={{ padding: 30 }}>
                        No pending card settlements.
                      </td>
                    </tr>
                  ) : (
                    data.unsettledCardApps.map((app) => (
                      <tr key={app.id}>
                        {settlementsCols.colOrder.map((colId) => {
                          if (!settlementsCols.colVisible[colId]) return null
                          if (colId === 'date') {
                            return (
                              <td key={colId} style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                {new Date(app.createdAt).toLocaleDateString('en-GB')}
                              </td>
                            )
                          }
                          if (colId === 'grossAmount') {
                            return (
                              <td key={colId} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                AED {app.paidAmount?.toFixed(2)}
                              </td>
                            )
                          }
                          if (colId === 'netAmount') {
                            return <td key={colId} style={{ textAlign: 'right', color: 'var(--text-muted)' }}>—</td>
                          }
                          if (colId === 'fee') {
                            return <td key={colId} style={{ textAlign: 'right', color: 'var(--text-muted)' }}>—</td>
                          }
                          if (colId === 'settlementNote') {
                            return <td key={colId} style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>—</td>
                          }
                          if (colId === 'actions') {
                            return (
                              <td key={colId} style={{ textAlign: 'center' }}>
                                <button
                                  className="btn-primary-glow"
                                  style={{ padding: '3px 10px', fontSize: '0.72rem', border: 'none' }}
                                  onClick={() => openSettleModal(app)}
                                >
                                  Settle Swipe
                                </button>
                              </td>
                            )
                          }
                          return null
                        })}
                      </tr>
                    ))
                  )
                ) : (
                  settledCardApps.length === 0 ? (
                    <tr>
                      <td colSpan={settlementsCols.colOrder.filter(c => settlementsCols.colVisible[c]).length} className="admin-empty" style={{ padding: 30 }}>
                        No settled card transactions found in this date range.
                      </td>
                    </tr>
                  ) : (
                    settledCardApps.map((app) => {
                      const gross = app.paidAmount || 0
                      const net = app.cardReceiptNet || 0
                      const fee = Math.max(0, gross - net)
                      return (
                        <tr key={app.id}>
                          {settlementsCols.colOrder.map((colId) => {
                            if (!settlementsCols.colVisible[colId]) return null
                            if (colId === 'date') {
                              return (
                                <td key={colId} style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                  {new Date(app.createdAt).toLocaleDateString('en-GB')}
                                </td>
                              )
                            }
                            if (colId === 'grossAmount') {
                              return (
                                <td key={colId} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                  AED {gross.toFixed(2)}
                                </td>
                              )
                            }
                            if (colId === 'netAmount') {
                              return (
                                <td key={colId} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--success)', fontWeight: 600 }}>
                                  AED {net.toFixed(2)}
                                </td>
                              )
                            }
                            if (colId === 'fee') {
                              return (
                                <td key={colId} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--danger)' }}>
                                  AED {fee.toFixed(2)}
                                </td>
                              )
                            }
                            if (colId === 'settlementNote') {
                              return (
                                <td key={colId} style={{ fontSize: '0.82rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={app.settlementNote || ''}>
                                  {app.settlementNote || <span className="text-muted">—</span>}
                                </td>
                              )
                            }
                            if (colId === 'actions') {
                              return (
                                <td key={colId} style={{ textAlign: 'center' }}>
                                  <button
                                    className="btn-outline-subtle d-flex align-items-center gap-1 mx-auto"
                                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                    onClick={() => openSettleModal(app)}
                                  >
                                    <EditIcon size={12} /> Edit
                                  </button>
                                </td>
                              )
                            }
                            return null
                          })}
                        </tr>
                      )
                    })
                  )
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </div>

      {/* Chronological Ledger (Full Width) */}
      <div className="grid-container" style={{ marginTop: 25 }}>
        <div className="grid-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="grid-toolbar-left">
            <h3>Ledger: <span style={{ color: 'var(--accent-primary)' }}>{selectedAccount}</span></h3>
          </div>
          <div className="grid-toolbar-right" style={{ gap: 8, display: 'flex', alignItems: 'center' }}>
            <Dropdown align="end" className="d-inline">
              <Dropdown.Toggle as="button" className="btn-outline-subtle" id="btn-export-ledger" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
              <Dropdown.Menu className="dropdown-menu-dark p-3" style={{ minWidth: 200 }}>
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
            <input type="date" className="grid-filter-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: 130, padding: '4px 8px', fontSize: '0.8rem' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
            <input type="date" className="grid-filter-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: 130, padding: '4px 8px', fontSize: '0.8rem' }} />
          </div>
        </div>

        <div className="admin-table-wrap" style={{ maxHeight: 450, overflowX: 'auto' }}>
          <Table className="admin-table">
            <thead>
              <tr>
                {ledgerCols.colOrder.map((colId, index) => {
                  if (!ledgerCols.colVisible[colId]) return null
                  const label = ledgerCols.friendlyNames[colId]
                  let style = { cursor: 'move', userSelect: 'none' }
                  if (colId === 'inflow' || colId === 'outflow') {
                    style.textAlign = 'right'
                  } else if (colId === 'action') {
                    style.textAlign = 'center'
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
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={ledgerCols.colOrder.filter(c => ledgerCols.colVisible[c]).length} className="admin-empty" style={{ padding: 40 }}>
                    No ledger transactions found in this date range.
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((entry) => (
                  <tr key={entry.id}>
                    {ledgerCols.colOrder.map((colId) => {
                      if (!ledgerCols.colVisible[colId]) return null
                      if (colId === 'date') {
                        return (
                          <td key={colId} style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                            {entry.date.toLocaleDateString('en-GB')}
                          </td>
                        )
                      }
                      if (colId === 'description') {
                        return (
                          <td key={colId} style={{ fontSize: '0.82rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {entry.description}
                          </td>
                        )
                      }
                      if (colId === 'inflow') {
                        return (
                          <td key={colId} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--success)', fontWeight: entry.inflow > 0 ? 600 : 400 }}>
                            {entry.inflow > 0 ? `+${entry.inflow.toFixed(2)}` : '—'}
                          </td>
                        )
                      }
                      if (colId === 'outflow') {
                        return (
                          <td key={colId} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--danger)', fontWeight: entry.outflow > 0 ? 600 : 400 }}>
                            {entry.outflow > 0 ? `-${entry.outflow.toFixed(2)}` : '—'}
                          </td>
                        )
                      }
                      if (colId === 'action') {
                        return (
                          <td key={colId} style={{ textAlign: 'center' }}>
                            {entry.isTransfer ? (
                              <button
                                className="btn-outline-subtle text-danger"
                                style={{ padding: '2px 8px', fontSize: '0.72rem', borderColor: 'rgba(239,68,68,0.2)' }}
                                onClick={() => handleDeleteTransfer(entry.transferId)}
                              >
                                Reverse
                              </button>
                            ) : entry.isEntityPayment ? (
                              <button
                                className="btn-outline-subtle text-danger"
                                style={{ padding: '2px 8px', fontSize: '0.72rem', borderColor: 'rgba(239,68,68,0.2)' }}
                                onClick={() => handleDeleteEntityPayment(entry.paymentId)}
                              >
                                Delete
                              </button>
                            ) : '—'}
                          </td>
                        )
                      }
                      return null
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* MODAL 1: ADD CARD/ACCOUNT */}
      <Modal show={showAddCardModal} onHide={() => setShowAddCardModal(false)} centered contentClassName="modal-dark">
        <Form onSubmit={handleCreateCard}>
          <Modal.Header closeButton className="border-secondary">
            <Modal.Title style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-primary)' }}>
              <PlusIcon size={18} /> Add New Card / Account
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="modal-field-label">Account / Card Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. ADIB Card, Rakbank Account, Naji's Card"
                value={newCardName}
                onChange={(e) => setNewCardName(e.target.value)}
                required
                autoFocus
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-secondary">
            <Button variant="outline-secondary" onClick={() => setShowAddCardModal(false)}>Cancel</Button>
            <Button type="submit" className="btn-primary-glow" disabled={savingCard || !newCardName.trim()}>
              {savingCard ? <Spinner animation="border" size="sm" /> : <><SaveIcon size={12} /> Save Account</>}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL 2: TRANSFER MONEY */}
      <Modal show={showTransferModal} onHide={() => setShowTransferModal(false)} centered contentClassName="modal-dark">
        <Form onSubmit={handleCreateTransfer}>
          <Modal.Header closeButton className="border-secondary">
            <Modal.Title style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-primary)' }}>
              <SalesIcon size={18} /> Transfer / Withdraw / Deposit
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="mb-3">
              <Form.Group>
                <Form.Label className="modal-field-label">Source Account (From)</Form.Label>
                <Form.Select
                  value={transferForm.fromAccount}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, fromAccount: e.target.value }))}
                >
                  <option value="Cash">Cash Box</option>
                  {activeCards.map(c => (
                    <option key={c.id} value={c.bankName}>{c.bankName}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group>
                <Form.Label className="modal-field-label">Destination (To)</Form.Label>
                <Form.Select
                  value={transferForm.toAccount}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, toAccount: e.target.value }))}
                  required
                >
                  <option value="">Select destination...</option>
                  <option value="Cash">Cash Box</option>
                  {activeCards.map(c => (
                    <option key={c.id} value={c.bankName}>{c.bankName}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="mb-3">
              <Form.Group>
                <Form.Label className="modal-field-label">Amount (AED)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </Form.Group>
              <Form.Group>
                <Form.Label className="modal-field-label">Date</Form.Label>
                <Form.Control
                  type="date"
                  value={transferForm.createdAt}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, createdAt: e.target.value }))}
                  required
                />
              </Form.Group>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="modal-field-label">Notes / Reference</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. ATM Withdrawal, Pay off Card, Deposit"
                value={transferForm.notes}
                onChange={(e) => setTransferForm(prev => ({ ...prev, notes: e.target.value }))}
              />
              <Form.Text className="text-muted" style={{ fontSize: '0.78rem' }}>
                Tip: To record cash withdrawal, transfer from Bank Account to Cash Box. To repay cards, transfer from Cash Box/Bank Account to Card.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-secondary">
            <Button variant="outline-secondary" onClick={() => setShowTransferModal(false)}>Cancel</Button>
            <Button type="submit" className="btn-primary-glow" disabled={savingTransfer || !transferForm.toAccount || !transferForm.amount}>
              {savingTransfer ? <Spinner animation="border" size="sm" /> : <><SaveIcon size={12} /> Record Transfer</>}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL 3: RECORD PORTAL / CARD PAYMENT */}
      <Modal show={showRecordPaymentModal} onHide={() => setShowRecordPaymentModal(false)} centered contentClassName="modal-dark">
        <Form onSubmit={handleCreatePayment}>
          <Modal.Header closeButton className="border-secondary">
            <Modal.Title style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warning)' }}>
              <PlusIcon size={18} /> Record Portal / Card Payment
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="modal-field-label">Government Portal / Entity</Form.Label>
              <Form.Select
                value={paymentForm.entityName}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, entityName: e.target.value }))}
                required
              >
                <option value="">Select Portal...</option>
                {govtEntities.map(ent => (
                  <option key={ent.id} value={ent.name}>{ent.name}</option>
                ))}
                <option value="Other">Other / Custom Entity...</option>
              </Form.Select>
            </Form.Group>

            {paymentForm.entityName === 'Other' && (
              <Form.Group className="mb-3">
                <Form.Label className="modal-field-label">Custom Entity Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Electricity Bill, Custom Portal"
                  value={paymentForm.customEntityName}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, customEntityName: e.target.value }))}
                  required
                />
              </Form.Group>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="mb-3">
              <Form.Group>
                <Form.Label className="modal-field-label">Paid Using (Card/Cash)</Form.Label>
                <Form.Select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                >
                  <option value="Cash">Cash Box</option>
                  {activeCards.map(c => (
                    <option key={c.id} value={c.bankName}>{c.bankName}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group>
                <Form.Label className="modal-field-label">Amount (AED)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </Form.Group>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="mb-3">
              <Form.Group>
                <Form.Label className="modal-field-label">Date</Form.Label>
                <Form.Control
                  type="date"
                  value={paymentForm.createdAt}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, createdAt: e.target.value }))}
                  required
                />
              </Form.Group>

              <Form.Group>
                <Form.Label className="modal-field-label">Notes / Reference</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Optional details"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-secondary">
            <Button variant="outline-secondary" onClick={() => setShowRecordPaymentModal(false)}>Cancel</Button>
            <Button type="submit" className="btn-primary-glow" disabled={savingPayment || !paymentForm.amount}>
              {savingPayment ? <Spinner animation="border" size="sm" /> : <><SaveIcon size={12} /> Save Payment</>}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL 4: SETTLE CARD TRANSACTION */}
      <Modal show={showSettleModal} onHide={() => setShowSettleModal(false)} centered contentClassName="modal-dark">
        <Form onSubmit={handleSaveSettlement}>
          <Modal.Header closeButton className="border-secondary">
            <Modal.Title style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-primary)' }}>
              <CardIcon size={18} /> Settle Card Transaction
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedSettleApp && (
              <>
                <div style={{ background: 'var(--bg-sidebar-active)', padding: 12, borderRadius: 'var(--radius-md)', marginBottom: 15 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.8rem' }}>
                    <div>
                      <span className="text-muted">Customer:</span> <strong className="text-light">{selectedSettleApp.customerName}</strong>
                    </div>
                    <div>
                      <span className="text-muted">Service:</span> <strong className="text-light">{selectedSettleApp.service?.name || 'Service'}</strong>
                    </div>
                    <div>
                      <span className="text-muted">Gross Swiped:</span> <strong style={{ color: 'var(--warning)' }}>AED {selectedSettleApp.paidAmount?.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-muted">Swipe Date:</span> <strong className="text-light">{new Date(selectedSettleApp.createdAt).toLocaleDateString('en-GB')}</strong>
                    </div>
                  </div>
                </div>

                <Form.Group className="mb-3">
                  <Form.Label className="modal-field-label">Credited Net Amount (AED)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedSettleApp.paidAmount || undefined}
                    placeholder="Enter net amount received in bank account"
                    value={settledNetInput}
                    onChange={(e) => setSettledNetInput(e.target.value)}
                    required
                    autoFocus
                  />
                  <Form.Text className="text-muted" style={{ fontSize: '0.78rem' }}>
                    Gross amount swiped was AED {selectedSettleApp.paidAmount?.toFixed(2)}. The difference is the machine charge.
                  </Form.Text>
                </Form.Group>

                {/* Calculate and display fee preview */}
                {(() => {
                  const gross = selectedSettleApp.paidAmount || 0
                  const net = parseFloat(settledNetInput) || 0
                  const fee = Math.max(0, gross - net)
                  return (
                    <div className="mb-3 d-flex justify-content-between align-items-center" style={{ fontSize: '0.85rem', padding: '8px 12px', background: 'rgba(239,68,68,0.05)', border: '1px dashed rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)' }}>
                      <span className="text-muted">Calculated Fee (Charges):</span>
                      <strong className="text-danger">AED {fee.toFixed(2)}</strong>
                    </div>
                  )
                })()}

                <Form.Group className="mb-3">
                  <Form.Label className="modal-label">Receiving Bank Account</Form.Label>
                  <Form.Select
                    value={settledAccInput}
                    onChange={(e) => setSettledAccInput(e.target.value)}
                    required
                  >
                    <option value="Bank">Bank Account (Bank)</option>
                    {activeCards.filter(c => c.bankName !== 'Bank').map(c => (
                      <option key={c.id} value={c.bankName}>{c.bankName}</option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted" style={{ fontSize: '0.78rem' }}>
                    Select which account/card received this settlement credit.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="modal-field-label">Settlement Note / Reference</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. Bank Ref #, transaction note"
                    value={settlementNoteInput}
                    onChange={(e) => setSettlementNoteInput(e.target.value)}
                  />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer className="border-secondary">
            <Button variant="outline-secondary" onClick={() => setShowSettleModal(false)}>Cancel</Button>
            <Button type="submit" className="btn-primary-glow" disabled={savingSettlement || !settledNetInput}>
              {savingSettlement ? <Spinner animation="border" size="sm" /> : <><SaveIcon size={12} /> Save Settlement</>}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}

export default Accounts
