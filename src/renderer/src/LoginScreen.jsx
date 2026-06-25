import { useState } from 'react'
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap'
import fcLogo from '../../logo-nobg.png'
import wallpaper from '../../Wallpaper.png'
import { MailIcon, KeyIcon, EyeIcon, EyeOffIcon } from './Icons'

export default function LoginScreen({ shopName, onLoginSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="login-container" style={{ backgroundImage: `url(${wallpaper})`, backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: 'cover' }}>
      <div className="login-box">
        <Card className="login-card shadow-lg">
          <Card.Body className="p-4">
            <div className="text-center mb-4">
              <img src={fcLogo} alt="Logo" style={{ width: 66, height: 66, objectFit: 'contain', display: 'block', margin: '0 auto 16px' }} />
              <h2 className="login-shop-name">Welcome back</h2>
              <p className="login-subtitle"></p>
            </div>

            {error && (
              <Alert variant="danger" className="text-center py-2 mb-3 small-alert">
                {error}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="loginUsername">
                <Form.Label className="small fw-semibold" style={{ color: '#475569' }}>Username</Form.Label>
                <div className="input-group-custom">
                  <span className="input-icon" style={{ height: '100%', top: 0, display: 'flex', alignItems: 'center' }}><MailIcon size={16} /></span>
                  <Form.Control
                    type="text"
                    placeholder="Username"
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
                <Form.Label className="small fw-semibold" style={{ color: '#475569' }}>Password</Form.Label>
                <div className="input-group-custom">
                  <span className="input-icon" style={{ height: '100%', top: 0, display: 'flex', alignItems: 'center' }}><KeyIcon size={16} /></span>
                  <Form.Control
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="login-input"
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      height: '100%',
                      zIndex: 5
                    }}
                  >
                    {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
              </Form.Group>

              <Button
                type="submit"
                variant="primary"
                className="w-100 py-2 btn-login"
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
