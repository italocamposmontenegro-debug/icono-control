import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader } from 'lucide-react';

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  if (authLoading) {
    return (
      <div className="login-loading">
        <Loader size={32} className="spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Credenciales inválidas. Verifica tu correo y contraseña.'
        : err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <Shield size={28} />
          </div>
          <h1 className="login-title">Ícono Control</h1>
          <p className="login-subtitle">
            Plataforma de Monitoreo — Proyecto Ícono<br />
            <span>Facultad de Ciencias de la Vida • UVM</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Correo electrónico</label>
            <input
              id="email" type="email" className="form-input"
              placeholder="usuario@uvm.cl"
              value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Contraseña</label>
            <div className="password-wrap">
              <input
                id="password" type={showPassword ? 'text' : 'password'}
                className="form-input" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg login-btn" disabled={loading}>
            {loading ? <Loader size={16} className="spin" /> : null}
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="login-footer-text">
          Sistema de uso exclusivo para miembros del Proyecto Ícono.
        </p>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh; display: flex;
          align-items: center; justify-content: center;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%);
          padding: var(--space-lg);
        }
        .login-card {
          background: var(--color-surface);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          width: 100%; max-width: 420px;
          padding: var(--space-2xl) var(--space-xl);
        }
        .login-header { text-align: center; margin-bottom: var(--space-xl); }
        .login-icon {
          width: 56px; height: 56px; margin: 0 auto var(--space-md);
          background: var(--color-primary); color: var(--color-accent);
          border-radius: var(--radius-md);
          display: flex; align-items: center; justify-content: center;
        }
        .login-title {
          font-size: 1.5rem; font-weight: 800; color: var(--color-text);
          margin-bottom: 4px;
        }
        .login-subtitle {
          font-size: 0.8rem; color: var(--color-text-muted); line-height: 1.5;
        }
        .login-subtitle span { font-size: 0.72rem; }
        .login-form { display: flex; flex-direction: column; gap: var(--space-md); }
        .login-error {
          background: #fee2e2; color: #991b1b;
          padding: var(--space-sm) var(--space-md);
          border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 500;
        }
        .password-wrap { position: relative; }
        .password-wrap .form-input { width: 100%; padding-right: 40px; }
        .password-toggle {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: var(--color-text-muted);
          padding: 4px; cursor: pointer;
        }
        .login-btn { width: 100%; justify-content: center; margin-top: var(--space-sm); }
        .login-footer-text {
          text-align: center; font-size: 0.7rem; color: var(--color-text-light);
          margin-top: var(--space-lg);
        }
        .login-loading {
          min-height: 100vh; display: flex;
          align-items: center; justify-content: center;
          background: var(--color-bg);
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
