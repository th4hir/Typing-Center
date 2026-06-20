import { useState, useEffect, useCallback } from 'react'
import { Form, Button, Spinner, Alert, Table } from 'react-bootstrap'

function AdminSettings({ shopConfig, onShopConfigSaved }) {
  // ── Shop config state ──
  const [editShopName, setEditShopName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [shopSaving, setShopSaving] = useState(false)

  // ── Category state ──
  const [categories, setCategories] = useState([])
  const [categoryName, setCategoryName] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)

  // ── Service state ──
  const [services, setServices] = useState([])
  const [serviceName, setServiceName] = useState('')
  const [servicePrice, setServicePrice] = useState('')
  const [serviceCategoryId, setServiceCategoryId] = useState('')
  const [serviceSaving, setServiceSaving] = useState(false)

  // ── Payment card state ──
  const [paymentCards, setPaymentCards] = useState([])
  const [cardBankName, setCardBankName] = useState('')
  const [cardSaving, setCardSaving] = useState(false)

  // ── Global state ──
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // ── Populate shop config ──
  useEffect(() => {
    if (shopConfig) {
      setEditShopName(shopConfig.shopName || '')
      setEditAddress(shopConfig.address || '')
      setEditPhone(shopConfig.phone || '')
    }
  }, [shopConfig])

  // ── Data loaders ──
  const loadCategories = useCallback(async () => {
    try {
      const result = await window.api.fetchCategories()
      if (result.success) setCategories(result.data)
    } catch (err) { setError(err.message) }
  }, [])

  const loadServices = useCallback(async () => {
    try {
      const result = await window.api.fetchServices()
      if (result.success) setServices(result.data)
    } catch (err) { setError(err.message) }
  }, [])

  const loadPaymentCards = useCallback(async () => {
    try {
      const result = await window.api.fetchPaymentCards()
      if (result.success) setPaymentCards(result.data)
    } catch (err) { setError(err.message) }
  }, [])

  useEffect(() => {
    loadCategories()
    loadServices()
    loadPaymentCards()
  }, [loadCategories, loadServices, loadPaymentCards])

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  // ── Shop config submit ──
  const handleSaveShopConfig = useCallback(async (e) => {
    e.preventDefault()
    if (!editShopName.trim()) return
    try {
      setShopSaving(true)
      setError(null)
      const result = await window.api.saveShopConfig({
        shopName: editShopName.trim(),
        address: editAddress.trim(),
        phone: editPhone.trim()
      })
      if (result.success) {
        setSuccessMsg('Shop info updated!')
        if (onShopConfigSaved) onShopConfigSaved(result.data)
      } else { setError(result.error) }
    } catch (err) { setError(err.message) }
    finally { setShopSaving(false) }
  }, [editShopName, editAddress, editPhone, onShopConfigSaved])

  // ── Category submit ──
  const handleAddCategory = useCallback(async (e) => {
    e.preventDefault()
    if (!categoryName.trim()) return
    try {
      setCategorySaving(true)
      setError(null)
      const result = await window.api.createCategory({ name: categoryName.trim() })
      if (result.success) {
        setCategoryName('')
        setSuccessMsg(`Category "${result.data.name}" created!`)
        await loadCategories()
      } else { setError(result.error) }
    } catch (err) { setError(err.message) }
    finally { setCategorySaving(false) }
  }, [categoryName, loadCategories])

  // ── Service submit ──
  const handleAddService = useCallback(async (e) => {
    e.preventDefault()
    if (!serviceName.trim() || !servicePrice || !serviceCategoryId) return
    try {
      setServiceSaving(true)
      setError(null)
      const result = await window.api.createService({
        name: serviceName.trim(),
        price: parseFloat(servicePrice),
        categoryId: parseInt(serviceCategoryId, 10)
      })
      if (result.success) {
        setServiceName('')
        setServicePrice('')
        setServiceCategoryId('')
        setSuccessMsg(`Service "${result.data.name}" created!`)
        await loadServices()
      } else { setError(result.error) }
    } catch (err) { setError(err.message) }
    finally { setServiceSaving(false) }
  }, [serviceName, servicePrice, serviceCategoryId, loadServices])

  // ── Payment card submit ──
  const handleAddCard = useCallback(async (e) => {
    e.preventDefault()
    if (!cardBankName.trim()) return
    try {
      setCardSaving(true)
      setError(null)
      const result = await window.api.createPaymentCard({ bankName: cardBankName.trim() })
      if (result.success) {
        setCardBankName('')
        setSuccessMsg(`Card "${result.data.bankName}" added!`)
        await loadPaymentCards()
      } else { setError(result.error) }
    } catch (err) { setError(err.message) }
    finally { setCardSaving(false) }
  }, [cardBankName, loadPaymentCards])

  // ── Toggle card active/inactive ──
  const handleToggleCard = useCallback(async (card) => {
    try {
      setError(null)
      const result = await window.api.togglePaymentCard({ id: card.id, isActive: !card.isActive })
      if (result.success) {
        await loadPaymentCards()
      } else { setError(result.error) }
    } catch (err) { setError(err.message) }
  }, [loadPaymentCards])

  return (
    <div className="admin-settings">
      <div className="page-header">
        <div className="page-header-left">
          <h1>⚙️ Admin Settings</h1>
          <p>Manage shop info, categories, services, and payment cards</p>
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
          ✅ {successMsg}
        </Alert>
      )}

      <div className="admin-grid">

        {/* ═══ SHOP INFO ═══ */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent-secondary)' }}>🏢</span>
            <div><h3>Shop Info</h3><span className="admin-card-count">This installation</span></div>
          </div>
          <Form onSubmit={handleSaveShopConfig} style={{ padding: '20px 22px' }}>
            <Form.Group className="mb-3">
              <Form.Label className="admin-form-label">Shop Name</Form.Label>
              <Form.Control type="text" placeholder="e.g. Abu Dhabi Typing Center" value={editShopName} onChange={(e) => setEditShopName(e.target.value)} className="admin-input" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="admin-form-label">Address</Form.Label>
              <Form.Control type="text" placeholder="e.g. Mussafah M-10, Abu Dhabi" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="admin-input" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="admin-form-label">Phone</Form.Label>
              <Form.Control type="tel" placeholder="02 XXX XXXX" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="admin-input" />
            </Form.Group>
            <Button type="submit" className="btn-primary-glow" disabled={shopSaving || !editShopName.trim()} style={{ border: 'none', width: '100%' }}>
              {shopSaving ? <Spinner animation="border" size="sm" /> : '💾 Save Shop Info'}
            </Button>
          </Form>
        </div>

        {/* ═══ CATEGORIES ═══ */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--success)' }}>📂</span>
            <div><h3>Categories</h3><span className="admin-card-count">{categories.length} total</span></div>
          </div>
          <Form onSubmit={handleAddCategory} className="admin-form">
            <Form.Control type="text" placeholder="Category name (e.g. Immigration)" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="admin-input" />
            <Button type="submit" className="btn-primary-glow admin-btn" disabled={categorySaving || !categoryName.trim()}>
              {categorySaving ? <Spinner animation="border" size="sm" /> : '+ Add'}
            </Button>
          </Form>
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <thead><tr><th>ID</th><th>Name</th></tr></thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr><td colSpan={2} className="admin-empty">No categories yet</td></tr>
                ) : categories.map((c) => (
                  <tr key={c.id}><td className="admin-td-id">{c.id}</td><td>{c.name}</td></tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>

        {/* ═══ PAYMENT CARDS ═══ */}
        <div className="admin-card admin-card-wide">
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--warning)' }}>💳</span>
            <div><h3>Payment Cards</h3><span className="admin-card-count">{paymentCards.length} cards</span></div>
          </div>
          <Form onSubmit={handleAddCard} className="admin-form">
            <Form.Control type="text" placeholder="Bank name (e.g. ADCB, Emirates NBD, Mashreq)" value={cardBankName} onChange={(e) => setCardBankName(e.target.value)} className="admin-input" />
            <Button type="submit" className="btn-primary-glow admin-btn" disabled={cardSaving || !cardBankName.trim()}>
              {cardSaving ? <Spinner animation="border" size="sm" /> : '+ Add Card'}
            </Button>
          </Form>
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <thead><tr><th>ID</th><th>Bank Name</th><th style={{ textAlign: 'center' }}>Status</th><th style={{ textAlign: 'center' }}>Action</th></tr></thead>
              <tbody>
                {paymentCards.length === 0 ? (
                  <tr><td colSpan={4} className="admin-empty">No payment cards yet</td></tr>
                ) : paymentCards.map((card) => (
                  <tr key={card.id}>
                    <td className="admin-td-id">{card.id}</td>
                    <td>💳 {card.bankName}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-badge ${card.isActive ? 'completed' : 'rejected'}`}>
                        {card.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn-outline-subtle" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => handleToggleCard(card)}>
                        {card.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>

        {/* ═══ SERVICES ═══ */}
        <div className="admin-card admin-card-wide">
          <div className="admin-card-header">
            <span className="admin-card-icon" style={{ background: 'rgba(96,165,250,0.15)', color: 'var(--info)' }}>📝</span>
            <div><h3>Services</h3><span className="admin-card-count">{services.length} total</span></div>
          </div>
          <Form onSubmit={handleAddService} className="admin-form admin-form-services">
            <Form.Control type="text" placeholder="Service name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="admin-input" />
            <Form.Control type="number" step="0.01" min="0" placeholder="Price (AED)" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} className="admin-input admin-input-price" />
            <Form.Select value={serviceCategoryId} onChange={(e) => setServiceCategoryId(e.target.value)} className="admin-input">
              <option value="">Select category...</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </Form.Select>
            <Button type="submit" className="btn-primary-glow admin-btn" disabled={serviceSaving || !serviceName.trim() || !servicePrice || !serviceCategoryId}>
              {serviceSaving ? <Spinner animation="border" size="sm" /> : '+ Add'}
            </Button>
          </Form>
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <thead><tr><th>ID</th><th>Service Name</th><th>Category</th><th style={{ textAlign: 'right' }}>Price (AED)</th></tr></thead>
              <tbody>
                {services.length === 0 ? (
                  <tr><td colSpan={4} className="admin-empty">No services yet — add categories first</td></tr>
                ) : services.map((s) => (
                  <tr key={s.id}>
                    <td className="admin-td-id">{s.id}</td>
                    <td>{s.name}</td>
                    <td><span className="admin-category-badge">{s.category?.name || '—'}</span></td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminSettings
