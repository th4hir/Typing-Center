import { useState, useEffect, useCallback, useMemo } from 'react'
import { Table, Button, Form, Spinner, Alert } from 'react-bootstrap'
import { PlusIcon, EditIcon, TrashIcon, RefreshIcon, SaveIcon, CardIcon, BillIcon } from './Icons'

function ExpensesManagement() {
  const [expenses, setExpenses] = useState([])
  const [paymentCards, setPaymentCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Form states
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [createdAt, setCreatedAt] = useState(
    new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0')
  )
  const [editingExpenseId, setEditingExpenseId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Load active payment cards
  const loadPaymentCards = useCallback(async () => {
    try {
      const result = await window.api.fetchPaymentCards()
      if (result.success) {
        setPaymentCards(result.data.filter(c => c.isActive))
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  // Load expenses
  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await window.api.fetchExpenses()
      if (result.success) {
        setExpenses(result.data)
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
    loadPaymentCards()
    loadExpenses()
  }, [loadPaymentCards, loadExpenses])

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  // Submit expense (Save or Update)
  const handleSaveExpense = useCallback(async (e) => {
    e.preventDefault()
    if (!description.trim() || !amount || parseFloat(amount) <= 0) return

    try {
      setSaving(true)
      setError(null)
      let result
      const parsedDate = createdAt ? new Date(createdAt + 'T12:00:00') : new Date()

      if (editingExpenseId) {
        result = await window.api.updateExpense({
          id: editingExpenseId,
          description: description.trim(),
          amount: parseFloat(amount),
          paymentMethod,
          createdAt: parsedDate
        })
      } else {
        result = await window.api.createExpense({
          description: description.trim(),
          amount: parseFloat(amount),
          paymentMethod,
          createdAt: parsedDate
        })
      }

      if (result.success) {
        setSuccessMsg(editingExpenseId ? 'Expense updated successfully!' : 'Expense added successfully!')
        setDescription('')
        setAmount('')
        setPaymentMethod('Cash')
        setCreatedAt(new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0'))
        setEditingExpenseId(null)
        await loadExpenses()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }, [description, amount, paymentMethod, createdAt, editingExpenseId, loadExpenses])

  const handleEditExpense = useCallback((exp) => {
    setEditingExpenseId(exp.id)
    setDescription(exp.description)
    setAmount(String(exp.amount))
    setPaymentMethod(exp.paymentMethod)
    if (exp.createdAt) {
      const d = new Date(exp.createdAt)
      const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
      setCreatedAt(dateStr)
    }
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingExpenseId(null)
    setDescription('')
    setAmount('')
    setPaymentMethod('Cash')
    setCreatedAt(new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0'))
  }, [])

  const handleDeleteExpense = useCallback(async (exp) => {
    if (!window.confirm(`Are you sure you want to delete the expense for "${exp.description}"?`)) return
    try {
      setLoading(true)
      const res = await window.api.deleteExpense({ id: exp.id })
      if (res.success) {
        setSuccessMsg(`Expense deleted successfully!`)
        await loadExpenses()
      } else {
        setError(res.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [loadExpenses])

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses
    const query = searchQuery.toLowerCase()
    return expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(query) ||
        e.paymentMethod.toLowerCase().includes(query) ||
        String(e.amount).includes(query)
    )
  }, [expenses, searchQuery])

  // Total expenses amount
  const grandTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
  }, [filteredExpenses])

  return (
    <div className="expenses-management">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--accent-primary)', display: 'inline-flex' }}><BillIcon size={24} /></span> Expenses & Accounts
          </h1>
          <p>Track business expenses, shop rent, utility bills, salaries, and other outflows</p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}
          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          <strong>Error:</strong> {error}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success"
          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: 'var(--success)', fontSize: '0.85rem' }}>
          {successMsg}
        </Alert>
      )}

      <div className="admin-grid">
        {/* Record/Edit Expense Card */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}><CardIcon size={18} /></span>
            <div>
              <h3>{editingExpenseId ? 'Edit Outflow' : 'Record Expense / Outflow'}</h3>
              <span className="admin-card-count">Office Accounts</span>
            </div>
          </div>
          <Form onSubmit={handleSaveExpense} style={{ padding: '20px 22px' }}>
            <Form.Group className="mb-3">
              <Form.Label className="admin-form-label">Description <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Shop Rent / Internet / Staff Salary"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="admin-input"
                autoFocus
              />
            </Form.Group>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="mb-3">
              <Form.Group>
                <Form.Label className="admin-form-label">Amount (AED) <span style={{ color: 'var(--danger)' }}>*</span></Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="admin-input"
                />
              </Form.Group>
              <Form.Group>
                <Form.Label className="admin-form-label">Date</Form.Label>
                <Form.Control
                  type="date"
                  value={createdAt}
                  onChange={(e) => setCreatedAt(e.target.value)}
                  required
                  className="admin-input"
                />
              </Form.Group>
            </div>
            <Form.Group className="mb-4">
              <Form.Label className="admin-form-label">Paid Via (Payment Method)</Form.Label>
              <Form.Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="admin-input"
              >
                <option value="Cash">Cash</option>
                {paymentCards.map((card) => (
                  <option key={card.id} value={card.bankName}>{card.bankName}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <div className="d-flex gap-2">
              {editingExpenseId && (
                <Button type="button" variant="outline-secondary" style={{ flex: 1, borderRadius: 'var(--radius-md)' }} onClick={handleCancelEdit} disabled={saving}>
                  Cancel
                </Button>
              )}
              <Button type="submit" className="btn-primary-glow" style={{ flex: 2, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} disabled={saving}>
                {saving ? <Spinner animation="border" size="sm" /> : <><SaveIcon size={14} /> {editingExpenseId ? 'Update Expense' : 'Save Expense'}</>}
              </Button>
            </div>
          </Form>
        </div>

        {/* Expenses List Card */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--success)' }}><BillIcon size={18} /></span>
            <div>
              <h3>Recorded Outflows</h3>
              <span className="admin-card-count">{filteredExpenses.length} entries</span>
            </div>
          </div>
          <div className="admin-form">
            <Form.Control
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-input"
              style={{ flex: 1 }}
            />
            <Button variant="outline-secondary" className="btn-outline-subtle" onClick={loadExpenses} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshIcon size={14} /> Refresh
            </Button>
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
                    <th>Paid Via</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr><td colSpan={5} className="admin-empty">No expenses matched search</td></tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {new Date(exp.createdAt).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="fw-semibold">{exp.description}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {exp.amount.toFixed(2)}
                        </td>
                        <td>
                          <span className="payment-method-badge">{exp.paymentMethod}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="d-flex justify-content-center gap-2">
                            <button className="btn-outline-subtle d-flex align-items-center gap-1" style={{ padding: '4px 10px', fontSize: '0.72rem' }} onClick={() => handleEditExpense(exp)}>
                              <EditIcon size={11} /> Edit
                            </button>
                            <button className="btn-outline-subtle text-danger d-flex align-items-center gap-1" style={{ padding: '4px 10px', fontSize: '0.72rem', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteExpense(exp)}>
                              <TrashIcon size={11} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredExpenses.length > 0 && (
                  <tfoot>
                    <tr style={{ background: 'var(--accent-glow)', borderTop: '2px solid var(--accent-primary)' }}>
                      <td colSpan={2} style={{ fontWeight: 700, padding: '12px 24px' }}>TOTAL</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', padding: '12px 24px' }}>
                        {grandTotal.toFixed(2)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExpensesManagement
