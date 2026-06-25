import { useState, useEffect, useCallback, useMemo } from 'react'
import { Spinner, Alert, Table, Form, Dropdown } from 'react-bootstrap'
import { ApplicationIcon, SalesIcon, CardIcon, SaveIcon, ReportIcon, BillIcon } from './Icons'
import { useTableColumns } from './useTableColumns'
import { exportToExcel, exportToPDF } from './exportHelper'

function MonthlyReport() {
  const appsCols = useTableColumns('monthly_report_apps', ['date', 'customer', 'service', 'charge', 'govtFee', 'profit'], {
    date: 'Date',
    customer: 'Customer',
    service: 'Service',
    charge: 'Charge',
    govtFee: 'Paid',
    profit: 'Profit'
  })

  const expensesCols = useTableColumns('monthly_report_expenses', ['date', 'description', 'amount'], {
    date: 'Date',
    description: 'Description',
    amount: 'Amount (AED)'
  })

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [data, setData] = useState({ applications: [], expenses: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadReport = useCallback(async (year, month) => {
    try {
      setLoading(true)
      setError(null)
      const result = await window.api.getMonthlyReport({ year, month })
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReport(selectedYear, selectedMonth)
  }, [selectedYear, selectedMonth, loadReport])



  // Years option range
  const years = useMemo(() => {
    const current = new Date().getFullYear()
    const list = []
    for (let y = current - 5; y <= current + 5; y++) {
      list.push(y)
    }
    return list
  }, [])

  // Months list helper
  const months = useMemo(() => [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ], [])

  // Financial calculations
  const totals = useMemo(() => {
    const apps = data.applications || []
    const exps = data.expenses || []

    const totalSales = apps.reduce((s, a) => s + a.serviceCharge, 0)
    const totalGovt = apps.reduce((s, a) => s + a.govtFee, 0)
    const grossProfit = apps.reduce((s, a) => s + a.typingFee, 0)
    const totalExpenses = exps.reduce((s, e) => s + e.amount, 0)
    const netProfit = grossProfit - totalExpenses

    // Application Payments In (Sales) Breakdown
    const cashSales = apps.filter(a => a.customerPayment === 'Cash').reduce((s, a) => s + a.serviceCharge, 0)
    const cardSales = apps.filter(a => a.customerPayment === 'Card').reduce((s, a) => s + a.serviceCharge, 0)
    const chequeSales = apps.filter(a => a.customerPayment === 'Cheque').reduce((s, a) => s + a.serviceCharge, 0)
    const transferSales = apps.filter(a => a.customerPayment === 'Account Transfer').reduce((s, a) => s + a.serviceCharge, 0)
    const creditSales = apps.filter(a => a.customerPayment === 'Credit').reduce((s, a) => s + a.serviceCharge, 0)
    const advanceSales = apps.filter(a => a.customerPayment === 'Advance').reduce((s, a) => s + a.serviceCharge, 0)

    // Application Payments Out (Govt Fees) Breakdown
    const cashGovt = apps.filter(a => a.govtPayment === 'Cash').reduce((s, a) => s + a.govtFee, 0)
    const cardGovt = apps.filter(a => a.govtPayment !== 'Cash' && a.govtPayment !== 'N/A').reduce((s, a) => s + a.govtFee, 0)

    // Expense Payments Out Breakdown
    const cashExpenses = exps.filter(e => e.paymentMethod === 'Cash').reduce((s, e) => s + e.amount, 0)
    const cardExpenses = totalExpenses - cashExpenses

    return {
      totalSales,
      totalGovt,
      grossProfit,
      totalExpenses,
      netProfit,
      cashSales,
      cardSales,
      chequeSales,
      transferSales,
      creditSales,
      advanceSales,
      cashGovt,
      cardGovt,
      cashExpenses,
      cardExpenses,
      appCount: apps.length,
      expCount: exps.length
    }
  }, [data])

  // Get active display month string
  const displayMonth = useMemo(() => {
    const match = months.find(m => m.value === selectedMonth)
    return match ? match.name + ' ' + selectedYear : selectedMonth + '/' + selectedYear
  }, [selectedMonth, selectedYear, months])

  const handleExport = useCallback(async (format) => {
    let shopConfig = null
    try {
      const shopRes = await window.api.getShopConfig()
      if (shopRes.success) shopConfig = shopRes.data
    } catch (err) {
      console.error(err)
    }

    const entries = [
      ...(data.applications || []).map(a => ({
        date: new Date(a.createdAt),
        category: 'Service',
        description: a.customerName,
        service: a.service?.name || '—',
        charge: a.serviceCharge,
        govtFee: a.govtFee,
        profit: a.typingFee
      })),
      ...(data.expenses || []).map(e => ({
        date: new Date(e.createdAt),
        category: 'Expense',
        description: e.description,
        service: `Expense (${e.paymentMethod || 'Cash'})`,
        charge: 0,
        govtFee: 0,
        profit: -e.amount
      }))
    ].sort((a, b) => a.date - b.date)

    const headers = ['Date', 'Category', 'Customer / Description', 'Service / Method', 'Charge (AED)', 'Govt Fee (AED)', 'Net Profit (AED)']
    const rows = entries.map(entry => [
      entry.date.toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' }),
      entry.category,
      entry.description,
      entry.service,
      entry.charge > 0 ? entry.charge.toFixed(2) : '—',
      entry.govtFee > 0 ? entry.govtFee.toFixed(2) : '—',
      entry.profit.toFixed(2)
    ])

    const formattedMonth = displayMonth
    const title = 'Monthly Financial Report'
    const subtitle = `Month: ${formattedMonth}`
    const defaultName = `monthly_report_${selectedYear}_${String(selectedMonth).padStart(2, '0')}`

    if (format === 'excel') {
      const res = await exportToExcel(headers, rows, `${defaultName}.xls`)
      if (res.success) alert('Report exported successfully!')
      else if (res.error !== 'Cancelled') alert(`Export failed: ${res.error}`)
    } else {
      const summaryCards = [
        { label: 'Gross Sales', value: `AED ${totals.totalSales.toFixed(2)}` },
        { label: 'Govt Outflow', value: `AED ${totals.totalGovt.toFixed(2)}` },
        { label: 'Gross Profit', value: `AED ${totals.grossProfit.toFixed(2)}` },
        { label: 'Expenses', value: `AED ${totals.totalExpenses.toFixed(2)}` },
        { label: 'Net Profit', value: `AED ${totals.netProfit.toFixed(2)}`, color: totals.netProfit >= 0 ? '#10b981' : '#ef4444' }
      ]
      const res = await exportToPDF(shopConfig, title, subtitle, headers, rows, `${defaultName}.pdf`, summaryCards)
      if (res.success) alert('Report exported successfully!')
      else if (res.error !== 'Cancelled') alert(`Export failed: ${res.error}`)
    }
  }, [data, selectedYear, selectedMonth, displayMonth, totals])

  return (
    <div className="monthly-report">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--accent-primary)', display: 'inline-flex' }}><ReportIcon size={24} /></span> Monthly Report
          </h1>
          <p>{displayMonth}</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: 10 }}>
          <Dropdown align="end" className="d-inline">
            <Dropdown.Toggle as="button" className="btn-outline-subtle" id="btn-export-monthly" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Export
            </Dropdown.Toggle>
            <Dropdown.Menu className="dropdown-menu-dark">
              <Dropdown.Item onClick={() => handleExport('excel')}>
                Export Excel (.xls)
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleExport('pdf')}>
                Export PDF (.pdf)
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <Form.Select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="grid-filter-input"
            style={{ width: 140 }}
          >
            {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
          </Form.Select>
          <Form.Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="grid-filter-input"
            style={{ width: 110 }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </Form.Select>
        </div>
      </div>

      {/* Financial Stat Dashboard Cards */}
      <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--accent-primary)' }}>
            <SalesIcon size={24} />
          </div>
          <div className="stat-card-value">{totals.totalSales.toFixed(0)}</div>
          <div className="stat-card-label">Gross Sales (AED)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--info)' }}>
            <CardIcon size={24} />
          </div>
          <div className="stat-card-value">{totals.totalGovt.toFixed(0)}</div>
          <div className="stat-card-label">Govt Outflow (AED)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--success)' }}>
            <SaveIcon size={24} />
          </div>
          <div className="stat-card-value">{totals.grossProfit.toFixed(0)}</div>
          <div className="stat-card-label">Gross Profit (AED)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--danger)' }}>
            <BillIcon size={24} />
          </div>
          <div className="stat-card-value">{totals.totalExpenses.toFixed(0)}</div>
          <div className="stat-card-label">Expenses (AED)</div>
        </div>
        <div className="stat-card" style={{ borderColor: totals.netProfit >= 0 ? 'rgba(52, 211, 153, 0.4)' : 'rgba(239, 68, 68, 0.4)' }}>
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: totals.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {totals.netProfit >= 0 ? <SaveIcon size={24} /> : <BillIcon size={24} />}
          </div>
          <div className="stat-card-value" style={{ color: totals.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {totals.netProfit.toFixed(0)}
          </div>
          <div className="stat-card-label">Net Profit (AED)</div>
        </div>
      </div>

      {/* Breakdowns Row */}
      <div className="report-breakdown">
        <div className="report-break-card">
          <div className="report-break-title">Revenue & Inflow Breakdown</div>
          <div className="report-break-row">
            <span>Cash (Applications)</span>
            <span className="report-break-val">AED {totals.cashSales.toFixed(2)}</span>
          </div>
          <div className="report-break-row">
            <span>Card (Applications)</span>
            <span className="report-break-val">AED {totals.cardSales.toFixed(2)}</span>
          </div>
          <div className="report-break-row">
            <span>Cheque (Applications)</span>
            <span className="report-break-val">AED {totals.chequeSales.toFixed(2)}</span>
          </div>
          <div className="report-break-row">
            <span>Account Transfer (Applications)</span>
            <span className="report-break-val">AED {totals.transferSales.toFixed(2)}</span>
          </div>
          <div className="report-break-row">
            <span>Credit (Applications)</span>
            <span className="report-break-val">AED {totals.creditSales.toFixed(2)}</span>
          </div>
          <div className="report-break-row">
            <span>Advance (Applications)</span>
            <span className="report-break-val">AED {totals.advanceSales.toFixed(2)}</span>
          </div>
          <div className="report-break-row report-break-total">
            <span>Total Gross Sales</span>
            <span className="report-break-val">AED {totals.totalSales.toFixed(2)}</span>
          </div>
        </div>

        <div className="report-break-card">
          <div className="report-break-title">General Expenses & Outflow Breakdown</div>
          <div className="report-break-row">
            <span>Cash Expenses</span>
            <span className="report-break-val">AED {totals.cashExpenses.toFixed(2)}</span>
          </div>
          <div className="report-break-row">
            <span>Card Expenses</span>
            <span className="report-break-val">AED {totals.cardExpenses.toFixed(2)}</span>
          </div>
          <div className="report-break-row report-break-total">
            <span>Total Expenses Paid Out</span>
            <span className="report-break-val">AED {totals.totalExpenses.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3"
          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          {error}
        </Alert>
      )}

      {/* Main Lists Grid */}
      <div className="admin-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
        {/* Service Applications list */}
        <div className="admin-card">
          <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="admin-card-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}><ApplicationIcon size={18} /></span>
              <div>
                <h3>Service Transactions</h3>
                <span className="admin-card-count">{totals.appCount} records</span>
              </div>
            </div>
            <Dropdown align="end" className="d-inline">
              <Dropdown.Toggle as="button" className="btn-outline-subtle py-1 px-2" style={{ fontSize: '0.75rem' }} id="col-selector-dropdown-monthly-apps">
                Columns
              </Dropdown.Toggle>
              <Dropdown.Menu className="dropdown-menu-dark p-3" style={{ minWidth: 200 }}>
                <h6 className="dropdown-header px-0 pt-0 pb-2 border-bottom text-start" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem' }}>Visible Columns</h6>
                <div className="pt-2 d-flex flex-column gap-2" style={{ maxHeight: 250, overflowY: 'auto' }}>
                  {appsCols.colOrder.map((col) => (
                    <label key={col} className="d-flex align-items-center text-start" style={{ cursor: 'pointer', fontSize: '0.85rem', gap: 8, color: 'var(--text-primary)', fontWeight: 500, margin: 0, userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={appsCols.colVisible[col]}
                        onChange={() => appsCols.toggleColumn(col)}
                        style={{ cursor: 'pointer' }}
                      />
                      {appsCols.friendlyNames[col]}
                    </label>
                  ))}
                </div>
              </Dropdown.Menu>
            </Dropdown>
          </div>
          <div className="admin-table-wrap" style={{ maxHeight: 380 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
                <Spinner animation="border" variant="light" size="sm" />
                <span style={{ color: 'var(--text-secondary)' }}>Loading...</span>
              </div>
            ) : (
              <Table className="admin-table">
                <thead>
                  <tr>
                    {appsCols.colOrder.map((colId, index) => {
                      if (!appsCols.colVisible[colId]) return null
                      let style = { cursor: 'move', userSelect: 'none' }
                      if (colId === 'charge' || colId === 'govtFee' || colId === 'profit') {
                        style.textAlign = 'right'
                      }
                      return (
                        <th
                          key={colId}
                          draggable
                          onDragStart={(e) => appsCols.handleDragStart(e, index)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => appsCols.handleDrop(e, index)}
                          style={style}
                          title="Drag to rearrange column order"
                        >
                          {appsCols.friendlyNames[colId]}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.applications?.length === 0 ? (
                    <tr><td colSpan={appsCols.colOrder.filter(c => appsCols.colVisible[c]).length} className="admin-empty">No applications processed in this month</td></tr>
                  ) : (
                    data.applications?.map((a) => (
                      <tr key={a.id}>
                        {appsCols.colOrder.map((colId) => {
                          if (!appsCols.colVisible[colId]) return null
                          switch (colId) {
                            case 'date':
                              return (
                                <td key={colId} style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                  {new Date(a.createdAt).toLocaleDateString('en-AE', { day: '2-digit', month: 'short' })}
                                </td>
                              )
                            case 'customer':
                              return (
                                <td key={colId} className="fw-semibold">{a.customerName}</td>
                              )
                            case 'service':
                              return (
                                <td key={colId}>{a.service?.name || '—'}</td>
                              )
                            case 'charge':
                              return (
                                <td key={colId} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.serviceCharge.toFixed(2)}</td>
                              )
                            case 'govtFee':
                              return (
                                <td key={colId} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.govtFee.toFixed(2)}</td>
                              )
                            case 'profit':
                              return (
                                <td key={colId} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--success)', fontWeight: 600 }}>{a.typingFee.toFixed(2)}</td>
                              )
                            default:
                              return null
                          }
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            )}
          </div>
        </div>

        {/* Expenses List */}
        <div className="admin-card">
          <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="admin-card-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' }}><BillIcon size={18} /></span>
              <div>
                <h3>General Expenses List</h3>
                <span className="admin-card-count">{totals.expCount} entries</span>
              </div>
            </div>
            <Dropdown align="end" className="d-inline">
              <Dropdown.Toggle as="button" className="btn-outline-subtle py-1 px-2" style={{ fontSize: '0.75rem' }} id="col-selector-dropdown-monthly-expenses">
                Columns
              </Dropdown.Toggle>
              <Dropdown.Menu className="dropdown-menu-dark p-3" style={{ minWidth: 200 }}>
                <h6 className="dropdown-header px-0 pt-0 pb-2 border-bottom text-start" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem' }}>Visible Columns</h6>
                <div className="pt-2 d-flex flex-column gap-2" style={{ maxHeight: 250, overflowY: 'auto' }}>
                  {expensesCols.colOrder.map((col) => (
                    <label key={col} className="d-flex align-items-center text-start" style={{ cursor: 'pointer', fontSize: '0.85rem', gap: 8, color: 'var(--text-primary)', fontWeight: 500, margin: 0, userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={expensesCols.colVisible[col]}
                        onChange={() => expensesCols.toggleColumn(col)}
                        style={{ cursor: 'pointer' }}
                      />
                      {expensesCols.friendlyNames[col]}
                    </label>
                  ))}
                </div>
              </Dropdown.Menu>
            </Dropdown>
          </div>
          <div className="admin-table-wrap" style={{ maxHeight: 380 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
                <Spinner animation="border" variant="light" size="sm" />
                <span style={{ color: 'var(--text-secondary)' }}>Loading...</span>
              </div>
            ) : (
              <Table className="admin-table">
                <thead>
                  <tr>
                    {expensesCols.colOrder.map((colId, index) => {
                      if (!expensesCols.colVisible[colId]) return null
                      let style = { cursor: 'move', userSelect: 'none' }
                      if (colId === 'amount') {
                        style.textAlign = 'right'
                      }
                      return (
                        <th
                          key={colId}
                          draggable
                          onDragStart={(e) => expensesCols.handleDragStart(e, index)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => expensesCols.handleDrop(e, index)}
                          style={style}
                          title="Drag to rearrange column order"
                        >
                          {expensesCols.friendlyNames[colId]}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.expenses?.length === 0 ? (
                    <tr><td colSpan={expensesCols.colOrder.filter(c => expensesCols.colVisible[c]).length} className="admin-empty">No shop expenses recorded in this month</td></tr>
                  ) : (
                    data.expenses?.map((e) => (
                      <tr key={e.id}>
                        {expensesCols.colOrder.map((colId) => {
                          if (!expensesCols.colVisible[colId]) return null
                          switch (colId) {
                            case 'date':
                              return (
                                <td key={colId} style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                  {new Date(e.createdAt).toLocaleDateString('en-AE', { day: '2-digit', month: 'short' })}
                                </td>
                              )
                            case 'description':
                              return (
                                <td key={colId} className="fw-semibold">{e.description}</td>
                              )
                            case 'amount':
                              return (
                                <td key={colId} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{e.amount.toFixed(2)}</td>
                              )
                            default:
                              return null
                          }
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MonthlyReport
