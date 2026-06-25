import { useState, useEffect, useCallback, useMemo } from 'react'
import { Spinner, Alert, Table, Dropdown } from 'react-bootstrap'
import { ApplicationIcon, SalesIcon, CardIcon, SaveIcon, ReportIcon } from './Icons'
import { useTableColumns } from './useTableColumns'
import { exportToExcel, exportToPDF } from './exportHelper'

function getTodayString() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function DailyReport() {
  const reportCols = useTableColumns('daily_report_list', ['id', 'customer', 'customerType', 'service', 'charge', 'govtFee', 'profit', 'customerPayment', 'govtPayment'], {
    id: 'ID',
    customer: 'Customer',
    customerType: 'Type',
    service: 'Service',
    charge: 'Charge',
    govtFee: 'Paid',
    profit: 'Profit',
    customerPayment: 'Cust. Paid',
    govtPayment: 'Govt. Paid'
  })

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
    const cardIn = applications.filter(a => a.customerPayment === 'Card').reduce((s, a) => s + a.serviceCharge, 0)
    const chequeIn = applications.filter(a => a.customerPayment === 'Cheque').reduce((s, a) => s + a.serviceCharge, 0)
    const transferIn = applications.filter(a => a.customerPayment === 'Account Transfer').reduce((s, a) => s + a.serviceCharge, 0)
    const creditIn = applications.filter(a => a.customerPayment === 'Credit').reduce((s, a) => s + a.serviceCharge, 0)
    const advanceIn = applications.filter(a => a.customerPayment === 'Advance').reduce((s, a) => s + a.serviceCharge, 0)
    const cashOut = applications.filter(a => a.govtPayment === 'Cash').reduce((s, a) => s + a.govtFee, 0)
    const cardOut = applications.filter(a => a.govtPayment !== 'Cash' && a.govtPayment !== 'N/A').reduce((s, a) => s + a.govtFee, 0)
    return { totalCharge, totalGovt, totalTyping, cashIn, cardIn, chequeIn, transferIn, creditIn, advanceIn, cashOut, cardOut, count: applications.length }
  }, [applications])

  const handleExport = useCallback(async (format) => {
    let shopConfig = null
    try {
      const shopRes = await window.api.getShopConfig()
      if (shopRes.success) shopConfig = shopRes.data
    } catch (err) {
      console.error(err)
    }

    const headers = ['ID', 'Customer', 'Type', 'Service', 'Charge (AED)', 'Govt Fee (AED)', 'Profit (AED)', 'Customer Payment', 'Govt Payment']
    const rows = applications.map(a => [
      a.id,
      a.customerName,
      a.customerType,
      a.service?.name || '—',
      a.serviceCharge.toFixed(2),
      a.govtFee.toFixed(2),
      a.typingFee.toFixed(2),
      a.customerPayment,
      a.govtPayment
    ])

    const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' })
    const title = 'Daily Transactions Report'
    const subtitle = `Date: ${formattedDate}`
    const defaultName = `daily_report_${selectedDate}`

    if (format === 'excel') {
      const res = await exportToExcel(headers, rows, `${defaultName}.xls`)
      if (res.success) alert('Report exported successfully!')
      else if (res.error !== 'Cancelled') alert(`Export failed: ${res.error}`)
    } else {
      const summaryCards = [
        { label: 'Transactions', value: String(totals.count) },
        { label: 'Total Sales', value: `AED ${totals.totalCharge.toFixed(2)}` },
        { label: 'Paid to Govt', value: `AED ${totals.totalGovt.toFixed(2)}` },
        { label: 'Net Profit', value: `AED ${totals.totalTyping.toFixed(2)}` }
      ]
      const res = await exportToPDF(shopConfig, title, subtitle, headers, rows, `${defaultName}.pdf`, summaryCards)
      if (res.success) alert('Report exported successfully!')
      else if (res.error !== 'Cancelled') alert(`Export failed: ${res.error}`)
    }
  }, [applications, selectedDate, totals])

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
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--accent-primary)', display: 'inline-flex' }}><ReportIcon size={24} /></span> Daily Report
          </h1>
          <p>{displayDate}</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: 8 }}>
          <Dropdown align="end" className="d-inline">
            <Dropdown.Toggle as="button" className="btn-outline-subtle" id="btn-export-daily" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--accent-primary)' }}>
            <ApplicationIcon size={24} />
          </div>
          <div className="stat-card-value">{totals.count}</div>
          <div className="stat-card-label">Transactions</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--success)' }}>
            <SalesIcon size={24} />
          </div>
          <div className="stat-card-value">{totals.totalCharge.toFixed(0)}</div>
          <div className="stat-card-label">Total Sales (AED)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--info)' }}>
            <CardIcon size={24} />
          </div>
          <div className="stat-card-value">{totals.totalGovt.toFixed(0)}</div>
          <div className="stat-card-label">Paid (AED)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ display: 'inline-flex', color: 'var(--success)' }}>
            <SaveIcon size={24} />
          </div>
          <div className="stat-card-value">{totals.totalTyping.toFixed(0)}</div>
          <div className="stat-card-label">Profit (AED)</div>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="report-breakdown">
        <div className="report-break-card">
          <div className="report-break-title">Money IN (from customers)</div>
          <div className="report-break-row">
            <span>Cash</span>
            <span className="report-break-val">AED {totals.cashIn.toFixed(2)}</span>
          </div>
          <div className="report-break-row">
            <span>Card</span>
            <span className="report-break-val">AED {totals.cardIn.toFixed(2)}</span>
          </div>
          <div className="report-break-row">
            <span>Cheque</span>
            <span className="report-break-val">AED {totals.chequeIn.toFixed(2)}</span>
          </div>
          <div className="report-break-row">
            <span>Account Transfer</span>
            <span className="report-break-val">AED {totals.transferIn.toFixed(2)}</span>
          </div>
          <div className="report-break-row">
            <span>Credit</span>
            <span className="report-break-val">AED {totals.creditIn.toFixed(2)}</span>
          </div>
          <div className="report-break-row">
            <span>Advance</span>
            <span className="report-break-val">AED {totals.advanceIn.toFixed(2)}</span>
          </div>
          <div className="report-break-row report-break-total">
            <span>Total</span>
            <span className="report-break-val">AED {totals.totalCharge.toFixed(2)}</span>
          </div>
        </div>
        <div className="report-break-card">
          <div className="report-break-title">Money OUT (to govt/entity)</div>
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
          <div className="grid-toolbar-right" style={{ display: 'flex', gap: 10 }}>
            <Dropdown align="end" className="d-inline">
              <Dropdown.Toggle as="button" className="btn-outline-subtle" id="col-selector-dropdown-daily">
                Columns
              </Dropdown.Toggle>
              <Dropdown.Menu className="dropdown-menu-dark p-3" style={{ minWidth: 200 }}>
                <h6 className="dropdown-header px-0 pt-0 pb-2 border-bottom text-start" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem' }}>Visible Columns</h6>
                <div className="pt-2 d-flex flex-column gap-2" style={{ maxHeight: 250, overflowY: 'auto' }}>
                  {reportCols.colOrder.map((col) => (
                    <label key={col} className="d-flex align-items-center text-start" style={{ cursor: 'pointer', fontSize: '0.85rem', gap: 8, color: 'var(--text-primary)', fontWeight: 500, margin: 0, userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={reportCols.colVisible[col]}
                        onChange={() => reportCols.toggleColumn(col)}
                        style={{ cursor: 'pointer' }}
                      />
                      {reportCols.friendlyNames[col]}
                    </label>
                  ))}
                </div>
              </Dropdown.Menu>
            </Dropdown>
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
                  {reportCols.colOrder.map((colId, index) => {
                    if (!reportCols.colVisible[colId]) return null
                    let style = { cursor: 'move', userSelect: 'none' }
                    if (colId === 'charge' || colId === 'govtFee' || colId === 'profit') {
                      style.textAlign = 'right'
                    }
                    return (
                      <th
                        key={colId}
                        draggable
                        onDragStart={(e) => reportCols.handleDragStart(e, index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => reportCols.handleDrop(e, index)}
                        style={style}
                        title="Drag to rearrange column order"
                      >
                        {reportCols.friendlyNames[colId]}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr><td colSpan={reportCols.colOrder.filter(c => reportCols.colVisible[c]).length} className="admin-empty">No transactions for this date</td></tr>
                ) : (
                  applications.map((a) => (
                    <tr key={a.id}>
                      {reportCols.colOrder.map((colId) => {
                        if (!reportCols.colVisible[colId]) return null
                        switch (colId) {
                          case 'id':
                            return <td key={colId} className="admin-td-id">{a.id}</td>
                          case 'customer':
                            return <td key={colId}>{a.customerName}</td>
                          case 'customerType':
                            return (
                              <td key={colId}>
                                <span className={`customer-type-badge ${a.customerType === 'Company' ? 'company' : 'individual'}`}>
                                  {a.customerType}
                                </span>
                              </td>
                            )
                          case 'service':
                            return <td key={colId}>{a.service?.name || '—'}</td>
                          case 'charge':
                            return <td key={colId} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.serviceCharge.toFixed(2)}</td>
                          case 'govtFee':
                            return <td key={colId} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.govtFee.toFixed(2)}</td>
                          case 'profit':
                            return <td key={colId} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--success)' }}>{a.typingFee.toFixed(2)}</td>
                          case 'customerPayment':
                            return <td key={colId}><span className="payment-method-badge">{a.customerPayment}</span></td>
                          case 'govtPayment':
                            return <td key={colId}><span className="payment-method-badge">{a.govtPayment}</span></td>
                          default:
                            return null
                        }
                      })}
                    </tr>
                  ))
                )}
              </tbody>
              {applications.length > 0 && (
                <tfoot>
                  <tr className="report-totals-row">
                    {(() => {
                      const visibleCols = reportCols.colOrder.filter(c => reportCols.colVisible[c]);
                      const firstNumericIdx = visibleCols.findIndex(c => c === 'charge' || c === 'govtFee' || c === 'profit');
                      
                      return visibleCols.map((colId, idx) => {
                        let text = '';
                        let align = 'left';
                        let color = 'inherit';
                        
                        if (colId === 'charge') {
                          text = totals.totalCharge.toFixed(2);
                          align = 'right';
                        } else if (colId === 'govtFee') {
                          text = totals.totalGovt.toFixed(2);
                          align = 'right';
                        } else if (colId === 'profit') {
                          text = totals.totalTyping.toFixed(2);
                          align = 'right';
                          color = 'var(--success)';
                        } else if (idx === 0 || (firstNumericIdx !== -1 && idx === firstNumericIdx - 1)) {
                          // Print TOTALS on the cell immediately preceding the first numeric, or the first cell if none precede
                          if (idx === 0 && firstNumericIdx > 0) {
                            text = 'TOTALS';
                          } else if (firstNumericIdx !== -1 && idx === firstNumericIdx - 1) {
                            text = 'TOTALS';
                          }
                        }
                        return <td key={colId} style={{ fontWeight: 700, textAlign: align, color }}>{text}</td>
                      })
                    })()}
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
