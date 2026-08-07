import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    const success = await login(email, password);
    setSubmitting(false);

    if (success) {
      navigate('/');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'radial-gradient(circle at 10% 20%, rgba(124, 58, 237, 0.08) 0%, transparent 40%), var(--bg-primary)'
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem 2rem' }}>
        
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: '0.5rem'
          }}>
            Event<span style={{ color: 'var(--accent-purple)' }}>Z</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Login to your premium ticket brokering engine
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="form-control"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          {/* CTA */}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', marginTop: '1rem' }} disabled={submitting}>
            {submitting ? 'Authenticating...' : 'Sign In'}
            {!submitting && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '14px', color: 'var(--text-secondary)' }}>
          <span>Don't have an account? </span>
          <Link to="/register" style={{ color: 'var(--accent-purple)', fontWeight: 600, textDecoration: 'none' }} className="hover-underline">
            Register here
          </Link>
        </div>

      </div>

      <style>{`
        .hover-underline:hover {
          text-decoration: underline !important;
        }
      `}</style>
    </div>
  );
};

export default Login;
