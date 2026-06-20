import { useState, useEffect, useCallback, useMemo } from 'react'
import { Spinner, Alert, Table } from 'react-bootstrap'

function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const fmt = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  return { startDate: fmt(start), endDate: fmt(end) }
}

function CardAccounts() {
  const [startDate, setStartDate] = useState(() => getMonthRange().startDate)
  const [endDate, setEndDate] = useState(() => getMonthRange().endDate)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await window.api.getCardAccounts({ startDate, endDate })
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
  }, [startDate, endDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Grand totals
  const grandTotals = useMemo(() => {
    if (!data) return { received: 0, paid: 0, net: 0 }
    const cardReceived = data.cards.reduce((s, c) => s + c.totalReceived, 0)
    const cardPaid = data.cards.reduce((s, c) => s + c.totalPaid, 0)
    return {
      received: cardReceived + (data.cash?.totalReceived || 0),
      paid: cardPaid + (data.cash?.totalPaid || 0),
      net: (cardReceived + (data.cash?.totalReceived || 0)) - (cardPaid + (data.cash?.totalPaid || 0))
    }
  }, [data])

  return (
    <div className="card-accounts">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>💳 Card Accounts</h1>
          <p>Track spending and receipts per payment method</p>
        </div>
        <div className="page-header-actions" style={{ gap: 8, display: 'flex', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>From</span>
          <input
            type="date"
            className="grid-filter-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: 160 }}
          />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>To</span>
          <input
            type="date"
            className="grid-filter-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: 160 }}
          />
        </div>
      </div>

      {/* Grand Totals */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">💰</div>
          </div>
          <div className="stat-card-value">{grandTotals.received.toFixed(0)}</div>
          <div className="stat-card-label">Total Received (AED)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">💸</div>
          </div>
          <div className="stat-card-value">{grandTotals.paid.toFixed(0)}</div>
          <div className="stat-card-label">Total Paid Out (AED)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">📊</div>
          </div>
          <div className="stat-card-value">{grandTotals.net.toFixed(0)}</div>
          <div className="stat-card-label">Net Balance (AED)</div>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3"
          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          {error}
        </Alert>
      )}

      {/* Card Table */}
      <div className="grid-container">
        <div className="grid-toolbar">
          <div className="grid-toolbar-left">
            <h3>Payment Method Breakdown</h3>
          </div>
          <div className="grid-toolbar-right">
            <button className="btn-outline-subtle" onClick={loadData}>🔄 Refresh</button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 50, gap: 10 }}>
            <Spinner animation="border" variant="light" size="sm" />
            <span style={{ color: 'var(--text-secondary)' }}>Loading...</span>
          </div>
        ) : data ? (
          <div className="admin-table-wrap" style={{ maxHeight: 500 }}>
            <Table className="admin-table">
              <thead>
                <tr>
                  <th>Payment Method</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Received from Customers</th>
                  <th style={{ textAlign: 'center' }}># Txns</th>
                  <th style={{ textAlign: 'right' }}>Paid to Govt</th>
                  <th style={{ textAlign: 'center' }}># Txns</th>
                  <th style={{ textAlign: 'right' }}>Net Balance</th>
                </tr>
              </thead>
              <tbody>
                {/* Cash row */}
                <tr>
                  <td><span className="payment-method-badge">💵 Cash</span></td>
                  <td style={{ textAlign: 'center' }}>—</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{data.cash.totalReceived.toFixed(2)}</td>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{data.cash.receivedCount}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{data.cash.totalPaid.toFixed(2)}</td>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{data.cash.paidCount}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: data.cash.netBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {data.cash.netBalance.toFixed(2)}
                  </td>
                </tr>

                {/* Card rows */}
                {data.cards.map((card) => (
                  <tr key={card.id}>
                    <td><span className="payment-method-badge">💳 {card.bankName}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-badge ${card.isActive ? 'completed' : 'rejected'}`}>
                        {card.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{card.totalReceived.toFixed(2)}</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{card.receivedCount}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{card.totalPaid.toFixed(2)}</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{card.paidCount}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: card.netBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {card.netBalance.toFixed(2)}
                    </td>
                  </tr>
                ))}

                {data.cards.length === 0 && (
                  <tr><td colSpan={7} className="admin-empty">No bank cards configured — add them in Admin Settings</td></tr>
                )}
              </tbody>
            </Table>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default CardAccounts
