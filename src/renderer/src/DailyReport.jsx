import { useState, useEffect, useCallback, useMemo } from 'react'
import { Spinner, Alert, Table } from 'react-bootstrap'

function getTodayString() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function DailyReport() {
  const [selectedDate, setSelectedDate] = useState(getTodayString())
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadReport = useCallback(async (date) => {
    try {
      setLoading(true)
      setError(null)
      const result = await window.api.getDailyReport({ date })
      if (result.success) {
        setApplications(result.data)
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
    loadReport(selectedDate)
  }, [selectedDate, loadReport])

  const handleDateChange = useCallback((e) => {
    setSelectedDate(e.target.value)
  }, [])

  // Compute totals
  const totals = useMemo(() => {
    const totalCharge = applications.reduce((s, a) => s + a.serviceCharge, 0)
    const totalGovt = applications.reduce((s, a) => s + a.govtFee, 0)
    const totalTyping = applications.reduce((s, a) => s + a.typingFee, 0)
    const cashIn = applications.filter(a => a.customerPayment === 'Cash').reduce((s, a) => s + a.serviceCharge, 0)
    const cardIn = totalCharge - cashIn
    const cashOut = applications.filter(a => a.govtPayment === 'Cash').reduce((s, a) => s + a.govtFee, 0)
    const cardOut = totalGovt - cashOut
    return { totalCharge, totalGovt, totalTyping, cashIn, cardIn, cashOut, cardOut, count: applications.length }
  }, [applications])

  // Formatted date for display
  const displayDate = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00')
    return d.toLocaleDateString('en-AE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  }, [selectedDate])

  return (
    <div className="daily-report">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>📊 Daily Report</h1>
          <p>{displayDate}</p>
        </div>
        <div className="page-header-actions">
          <input
            type="date"
            className="grid-filter-input"
            value={selectedDate}
            onChange={handleDateChange}
            style={{ width: 180 }}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">📋</div>
          </div>
          <div className="stat-card-value">{totals.count}</div>
          <div className="stat-card-label">Transactions</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">💰</div>
          </div>
          <div className="stat-card-value">{totals.totalCharge.toFixed(0)}</div>
          <div className="stat-card-label">Total Sales (AED)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">🏛️</div>
          </div>
          <div className="stat-card-value">{totals.totalGovt.toFixed(0)}</div>
          <div className="stat-card-label">Govt Fees (AED)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">✅</div>
          </div>
          <div className="stat-card-value">{totals.totalTyping.toFixed(0)}</div>
          <div className="stat-card-label">Profit (AED)</div>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="report-breakdown">
        <div className="report-break-card">
          <div className="report-break-title">💵 Money IN (from customers)</div>
          <div className="report-break-row">
            <span>Cash</span>
            <span className="report-break-val">AED {totals.cashIn.toFixed(2)}</span>
          </div>
          <div className="report-break-row">
            <span>Card</span>
            <span className="report-break-val">AED {totals.cardIn.toFixed(2)}</span>
          </div>
          <div className="report-break-row report-break-total">
            <span>Total</span>
            <span className="report-break-val">AED {totals.totalCharge.toFixed(2)}</span>
          </div>
        </div>
        <div className="report-break-card">
          <div className="report-break-title">💸 Money OUT (to govt/entity)</div>
          <div className="report-break-row">
            <span>Cash</span>
            <span className="report-break-val">AED {totals.cashOut.toFixed(2)}</span>
          </div>
          <div className="report-break-row">
            <span>Card</span>
            <span className="report-break-val">AED {totals.cardOut.toFixed(2)}</span>
          </div>
          <div className="report-break-row report-break-total">
            <span>Total</span>
            <span className="report-break-val">AED {totals.totalGovt.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3"
          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          {error}
        </Alert>
      )}

      {/* Transactions Table */}
      <div className="grid-container">
        <div className="grid-toolbar">
          <div className="grid-toolbar-left">
            <h3>Transactions</h3>
            <span className="record-count">{applications.length} records</span>
          </div>
        </div>
        <div className="admin-table-wrap" style={{ maxHeight: 400 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
              <Spinner animation="border" variant="light" size="sm" />
              <span style={{ color: 'var(--text-secondary)' }}>Loading...</span>
            </div>
          ) : (
            <Table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Service</th>
                  <th style={{ textAlign: 'right' }}>Charge</th>
                  <th style={{ textAlign: 'right' }}>Govt Fee</th>
                  <th style={{ textAlign: 'right' }}>Profit</th>
                  <th>Cust. Paid</th>
                  <th>Govt. Paid</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr><td colSpan={9} className="admin-empty">No transactions for this date</td></tr>
                ) : (
                  applications.map((a) => (
                    <tr key={a.id}>
                      <td className="admin-td-id">{a.id}</td>
                      <td>{a.customerName}</td>
                      <td>
                        <span className={`customer-type-badge ${a.customerType === 'Company' ? 'company' : 'individual'}`}>
                          {a.customerType}
                        </span>
                      </td>
                      <td>{a.service?.name || '—'}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.serviceCharge.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.govtFee.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--success)' }}>{a.typingFee.toFixed(2)}</td>
                      <td><span className="payment-method-badge">{a.customerPayment}</span></td>
                      <td><span className="payment-method-badge">{a.govtPayment}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
              {applications.length > 0 && (
                <tfoot>
                  <tr className="report-totals-row">
                    <td colSpan={4} style={{ fontWeight: 700 }}>TOTALS</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{totals.totalCharge.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{totals.totalGovt.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{totals.totalTyping.toFixed(2)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}

export default DailyReport
