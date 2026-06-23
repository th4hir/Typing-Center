import { useState, useEffect, useCallback, useMemo } from 'react'
import { Spinner, Alert, Table, Form } from 'react-bootstrap'
import { ApplicationIcon, SalesIcon, CardIcon, SaveIcon, ReportIcon, BillIcon } from './Icons'

function MonthlyReport() {
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
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}><ApplicationIcon size={18} /></span>
            <div>
              <h3>Service Transactions</h3>
              <span className="admin-card-count">{totals.appCount} records</span>
            </div>
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
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Service</th>
                    <th style={{ textAlign: 'right' }}>Charge</th>
                    <th style={{ textAlign: 'right' }}>Paid</th>
                    <th style={{ textAlign: 'right' }}>Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.applications?.length === 0 ? (
                    <tr><td colSpan={6} className="admin-empty">No applications processed in this month</td></tr>
                  ) : (
                    data.applications?.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {new Date(a.createdAt).toLocaleDateString('en-AE', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="fw-semibold">{a.customerName}</td>
                        <td>{a.service?.name || '—'}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.serviceCharge.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.govtFee.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--success)', fontWeight: 600 }}>{a.typingFee.toFixed(2)}</td>
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
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' }}><BillIcon size={18} /></span>
            <div>
              <h3>General Expenses List</h3>
              <span className="admin-card-count">{totals.expCount} entries</span>
            </div>
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
                    <th>Date</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount (AED)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenses?.length === 0 ? (
                    <tr><td colSpan={3} className="admin-empty">No shop expenses recorded in this month</td></tr>
                  ) : (
                    data.expenses?.map((e) => (
                      <tr key={e.id}>
                        <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {new Date(e.createdAt).toLocaleDateString('en-AE', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="fw-semibold">{e.description}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{e.amount.toFixed(2)}</td>
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
