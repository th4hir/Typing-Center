import { useState } from 'react'
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap'
import logo from '../../logo.png'

export default function LoginScreen({ shopName, onLoginSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await window.api.login({ username: username.trim(), password })
      if (res.success) {
        onLoginSuccess(res.data)
      } else {
        setError(res.error || 'Invalid credentials')
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="text-center mb-4">
          <div className="login-logo-container" style={{ width: 80, height: 80, padding: 10, background: 'rgba(255, 255, 255, 0.04)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 0 20px rgba(108, 99, 255, 0.1)', margin: '0 auto 16px' }}>
            <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h2 className="login-shop-name">{shopName || 'Typing Center'}</h2>
          <p className="login-subtitle">Staff & Admin Login</p>
        </div>

        <Card className="login-card shadow-lg">
          <Card.Body className="p-4">
            {error && (
              <Alert variant="danger" className="text-center py-2 mb-3 small-alert">
                {error}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="loginUsername">
                <Form.Label className="small fw-semibold text-light-gray">Username</Form.Label>
                <div className="input-group-custom">
                  <span className="input-icon">👤</span>
                  <Form.Control
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                    autoFocus
                    className="login-input"
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-4" controlId="loginPassword">
                <Form.Label className="small fw-semibold text-light-gray">Password</Form.Label>
                <div className="input-group-custom">
                  <span className="input-icon">🔑</span>
                  <Form.Control
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="login-input"
                  />
                </div>
              </Form.Group>

              <Button
                type="submit"
                variant="primary"
                className="w-100 py-2 btn-login btn-gradient"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </Form>
          </Card.Body>
        </Card>

        <div className="text-center mt-4 login-footer">
          <p className="text-muted small">Default admin credentials: <strong>admin</strong> / <strong>admin</strong></p>
        </div>
      </div>
    </div>
  )
}
